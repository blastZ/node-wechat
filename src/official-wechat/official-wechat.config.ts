import { CacheAdapter, Logger } from './official-wechat.interface';

export type OfficialWechatConfig = {
  appId: string;
  appSecret: string;
  retryCount?: number; // default is 1
  logger?: Logger | boolean;
  cacheAdapter?: CacheAdapter;
};
