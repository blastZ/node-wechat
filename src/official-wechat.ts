import fetch from 'node-fetch';

export class OfficialWeChat {
  private appId: string;
  private appSecret: string;
  private url = 'https://api.weixin.qq.com/cgi-bin';

  private logger: any = {
    debug: console.log,
    error: console.error,
  };
  private cacheAdapter: any;

  constructor(config: { appId: string; appSecret: string; logger?: any; cacheAdapter?: any }) {
    this.appId = config.appId;
    this.appSecret = config.appSecret;

    config.logger && (this.logger = config.logger);
    config.cacheAdapter && (this.cacheAdapter = config.cacheAdapter);
  }

  // https://developers.weixin.qq.com/doc/offiaccount/Basic_Information/Get_access_token.html
  private async getAccessToken() {
    if (this?.cacheAdapter?.getAccessToken) {
      const token = await this.cacheAdapter.getAccessToken();

      this.logger.debug({ tokenFromCache: token });

      if (token) return token;
    }

    const result = (await fetch(
      `${this.url}/token?grant_type=client_credential&appid=${this.appId}&secret=${this.appSecret}`,
    ).then((o) => o.json())) as AccessTokenResponse | ErrorResponse;

    if ((<ErrorResponse>result).errcode) {
      this.logger.error({
        errcode: (<ErrorResponse>result).errcode,
        errmsg: (<ErrorResponse>result).errmsg,
      });

      throw new Error('ERR_GET_ACCESS_TOKEN');
    }

    this.logger.debug(result);

    const { access_token, expires_in } = <AccessTokenResponse>result;

    // 200s
    if (this?.cacheAdapter?.setAccessToken) {
      await this.cacheAdapter.setAccessToken(access_token, expires_in - 200);
    }

    return access_token;
  }

  // https://developers.weixin.qq.com/doc/offiaccount/Account_Management/Generating_a_Parametric_QR_Code.html
  async getTempQRCode(sceneStr: string) {
    const expireSeconds = 1 * 24 * 60 * 60;
    const token = await this.getAccessToken();

    if (this?.cacheAdapter?.getQRCode) {
      const qrCode = await this.cacheAdapter.getQRCode(sceneStr);
      if (qrCode) {
        this.logger.debug('get qrCode from cache');
        return `data:image/png;base64,${qrCode}`;
      }
    }

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
    }).then((o) => o.json())) as ErrorResponse | TempQRCodeResponse;

    if ((<ErrorResponse>result).errcode) {
      this.logger.error({
        errcode: (<ErrorResponse>result).errcode,
        errmsg: (<ErrorResponse>result).errmsg,
      });

      if ((<ErrorResponse>result).errcode === 40001) {
        if (this?.cacheAdapter?.deleteAccessToken) {
          await this.cacheAdapter.deleteAccessToken();
        }
      }

      throw new Error('ERR_GET_TEMP_QR_CODE');
    }

    const { ticket } = <TempQRCodeResponse>result;

    this.logger.debug({ ticket });

    const img = await fetch(
      `https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=${encodeURI(ticket)}`,
    ).then((o) => o.buffer());
    const b64 = img.toString('base64');

    if (this?.cacheAdapter?.setQRCode) {
      await this.cacheAdapter.setQRCode(sceneStr, b64);
    }

    return `data:image/png;base64,${b64}`;
  }

  // https://developers.weixin.qq.com/doc/offiaccount/User_Management/Get_users_basic_information_UnionID.html#UinonId
  async getUserInfo(openId: string) {
    const token = await this.getAccessToken();
    const result = (await fetch(
      `${this.url}/user/info?access_token=${token}&openid=${openId}&lang=zh_CN`,
    ).then((o) => o.json())) as ErrorResponse | UserInfoResponse;

    if ((<ErrorResponse>result).errcode) {
      this.logger.error({
        errcode: (<ErrorResponse>result).errcode,
        errmsg: (<ErrorResponse>result).errmsg,
      });

      if ((<ErrorResponse>result).errcode === 40001) {
        if (this?.cacheAdapter?.deleteAccessToken) {
          await this.cacheAdapter.deleteAccessToken();
        }
      }

      throw new Error('ERR_GET_TEMP_QR_CODE');
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
}

type ErrorResponse = {
  errcode: number;
  errmsg: string;
};

type AccessTokenResponse = {
  access_token: string;
  expires_in: number; // 单位秒
};

type TempQRCodeResponse = {
  ticket: string;
  expire_seconds: number;
  url: string;
};

type UserInfoResponse = {
  subscribe: 0 | 1; // 0 未关注
  openid: string;
  nickname: string;
  sex: 0 | 1 | 2; // 0 未知 1 男性 2 女性
  language: string;
  city: string;
  province: string;
  country: string;
  headimgurl: string;
  subscribe_time: number;
  unionid: string;
  remark: string; // 公众号运营者对粉丝的备注，公众号运营者可在微信公众平台用户管理界面对粉丝添加备注
  groupid: number;
  tagid_list: string[]; // 不确定，可能是 string 也可能是 number
  subscribe_scene: string;
  qr_scene: number;
  qr_scene_str: string; // 二维码扫码场景描述（开发者自定义）
};
