export type ErrorResponse = {
  errcode: number;
  errmsg: string;
};

export type AccessTokenResponse = {
  access_token: string;
  expires_in: number; // 单位秒
};

export type QRCodeTicketResponse = {
  ticket: string;
  expire_seconds: number;
  url: string;
};

export type UserInfoResponse = {
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

export type GetUserInfoResult = {
  subscribe: UserInfoResponse['subscribe'];
  openId: UserInfoResponse['openid'];
  nickname: UserInfoResponse['nickname'];
  sex: UserInfoResponse['sex'];
  language: UserInfoResponse['language'];
  city: UserInfoResponse['city'];
  province: UserInfoResponse['province'];
  country: UserInfoResponse['country'];
  subscribeTime: UserInfoResponse['subscribe_time'];
  unionId: UserInfoResponse['unionid'];
  headImg: UserInfoResponse['headimgurl'];
};

export interface CacheAdapter {
  setAccessToken: (key: string, value: string, ttl: number) => any;
  getAccessToken: (key: string) => Promise<string | null | undefined> | string | null | undefined;
  deleteAccessToken: (key: string) => any;
  setQRCode: (key: string, value: string, ttl: number) => any;
  getQRCode: (key: string) => Promise<string | null | undefined> | string | null | undefined;
}

export interface Logger {
  debug: (...args: any) => any;
  error: (...args: any) => any;
}
