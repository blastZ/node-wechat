import fetch from 'node-fetch';
import { OfficialWechatConfig } from './official-wechat.config';
import { ACCESS_TOKEN_KEY, DEFAULT_EXPIRE_SECONDS, QR_CODE_KEY } from './official-wechat.constant';
import {
  AccessTokenResponse,
  CacheAdapter,
  ErrorResponse,
  GetUserInfoResult,
  Logger,
  QRCodeTicketResponse,
  UserInfoResponse,
} from './official-wechat.interface';

export class OfficialWechat {
  private appId: string;
  private appSecret: string;
  private url = 'https://api.weixin.qq.com/cgi-bin';

  private retryCount: number = 1;
  private logger?: Logger;
  private cacheAdapter?: CacheAdapter;

  constructor(config: OfficialWechatConfig) {
    if (!config.appId || !config.appSecret) {
      throw new Error('ERR_MISSING_REQUIRED_PARAMS');
    }

    this.appId = config.appId;
    this.appSecret = config.appSecret;

    if (config.logger) {
      if (config.logger === true) {
        this.logger = {
          debug: console.log,
          error: console.error,
        };
      } else {
        this.logger = config.logger;
      }
    }

    config.cacheAdapter && (this.cacheAdapter = config.cacheAdapter);

    if (typeof config.retryCount === 'number') {
      this.retryCount = config.retryCount;
    }
  }

  private async _getAccessToken(retryNumber: number = 0): Promise<AccessTokenResponse> {
    const result = (await fetch(
      `${this.url}/token?grant_type=client_credential&appid=${this.appId}&secret=${this.appSecret}`,
    ).then((o) => o.json())) as AccessTokenResponse | ErrorResponse;

    if ((<ErrorResponse>result).errcode) {
      this.logger?.error({
        errcode: (<ErrorResponse>result).errcode,
        errmsg: (<ErrorResponse>result).errmsg,
      });

      if (retryNumber < this.retryCount) {
        return this._getAccessToken(retryNumber + 1);
      } else {
        throw new Error('ERR_GET_ACCESS_TOKEN');
      }
    }

    this.logger?.debug(result);

    return <AccessTokenResponse>result;
  }

  // https://developers.weixin.qq.com/doc/offiaccount/Basic_Information/Get_access_token.html
  async getAccessToken() {
    if (this?.cacheAdapter?.getAccessToken) {
      const token = await this.cacheAdapter.getAccessToken(ACCESS_TOKEN_KEY);

      this.logger?.debug({ tokenFromCache: token });

      if (token) return token;
    }

    const { access_token, expires_in } = await this._getAccessToken();

    if (this?.cacheAdapter?.setAccessToken) {
      await this.cacheAdapter.setAccessToken(ACCESS_TOKEN_KEY, access_token, expires_in - 5 * 60);
    }

    return access_token;
  }

  private async getQRCodeTicket(
    sceneStr: string,
    expireSeconds: number = DEFAULT_EXPIRE_SECONDS,
    retryNumber: number = 0,
  ): Promise<string> {
    const token = await this.getAccessToken();

    const result = (await fetch(`${this.url}/qrcode/create?access_token=${token}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        expire_seconds: expireSeconds,
        action_name: 'QR_STR_SCENE',
        action_info: { scene: { scene_str: sceneStr } },
      }),
    }).then((o) => o.json())) as ErrorResponse | QRCodeTicketResponse;

    if ((<ErrorResponse>result).errcode) {
      this.logger?.error({
        errcode: (<ErrorResponse>result).errcode,
        errmsg: (<ErrorResponse>result).errmsg,
      });

      if ((<ErrorResponse>result).errcode === 40001) {
        if (this?.cacheAdapter?.deleteAccessToken) {
          await this.cacheAdapter.deleteAccessToken(ACCESS_TOKEN_KEY);
        }
      }

      if (retryNumber < this.retryCount) {
        return this.getQRCodeTicket(sceneStr, expireSeconds, retryNumber + 1);
      } else {
        throw new Error('ERR_GET_QR_CODE_TICKET');
      }
    }

    const ticket = (result as QRCodeTicketResponse).ticket;

    this.logger?.debug({ ticket });

    return ticket;
  }

  private async getQRCodeImage(ticket: string, retryNumber: number = 0): Promise<string> {
    const img = await fetch(
      `https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=${encodeURI(ticket)}`,
    )
      .then((o) => o.buffer())
      .catch((err) => {
        this.logger?.error(err);

        if (retryNumber < this.retryCount) {
          return this.getQRCodeImage(ticket, retryNumber + 1);
        } else {
          throw new Error('ERR_GET_QR_CODE_IMAGE');
        }
      });

    const b64 = img.toString('base64');

    const image = `data:image/png;base64,${b64}`;

    this.logger?.debug({ image });

    return image;
  }

  // https://developers.weixin.qq.com/doc/offiaccount/Account_Management/Generating_a_Parametric_QR_Code.html
  async getQRCode(
    sceneStr: string,
    expireSeconds: number = DEFAULT_EXPIRE_SECONDS,
  ): Promise<string> {
    const cacheKey = `${QR_CODE_KEY}:${sceneStr}`;

    if (this?.cacheAdapter?.getQRCode) {
      const qrCode = await this.cacheAdapter.getQRCode(cacheKey);

      if (qrCode) {
        this.logger?.debug('get qrCode from cache');

        return qrCode;
      }
    }

    const ticket = await this.getQRCodeTicket(sceneStr, expireSeconds);
    const image = await this.getQRCodeImage(ticket);

    if (this?.cacheAdapter?.setQRCode) {
      await this.cacheAdapter.setQRCode(cacheKey, image, expireSeconds - 5 * 60);
    }

    return image;
  }

  private async _getUserInfo(openId: string, retryNumber: number = 0): Promise<GetUserInfoResult> {
    const token = await this.getAccessToken();

    const result = (await fetch(
      `${this.url}/user/info?access_token=${token}&openid=${openId}&lang=zh_CN`,
    ).then((o) => o.json())) as ErrorResponse | UserInfoResponse;

    if ((<ErrorResponse>result).errcode) {
      this.logger?.error({
        errcode: (<ErrorResponse>result).errcode,
        errmsg: (<ErrorResponse>result).errmsg,
      });

      if ((<ErrorResponse>result).errcode === 40001) {
        if (this?.cacheAdapter?.deleteAccessToken) {
          await this.cacheAdapter.deleteAccessToken(ACCESS_TOKEN_KEY);
        }
      }

      if (retryNumber < this.retryCount) {
        return this._getUserInfo(openId, retryNumber + 1);
      } else {
        throw new Error('ERR_GET_USER_INFO');
      }
    }

    const {
      subscribe,
      openid,
      nickname,
      sex,
      language,
      city,
      province,
      country,
      subscribe_time: subscribeTime,
      unionid: unionId,
      headimgurl: headImg,
    } = <UserInfoResponse>result;

    return {
      subscribe,
      openId: openid,
      nickname,
      sex,
      language,
      city,
      province,
      country,
      subscribeTime,
      unionId,
      headImg,
    };
  }

  // https://developers.weixin.qq.com/doc/offiaccount/User_Management/Get_users_basic_information_UnionID.html#UinonId
  async getUserInfo(openId: string): Promise<GetUserInfoResult> {
    return this._getUserInfo(openId);
  }
}
