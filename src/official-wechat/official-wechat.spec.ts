import { config } from 'dotenv';
import { OfficialWechat } from './official-wechat.class';
import { CacheAdapter } from './official-wechat.interface';
import { SimpleCacheAdatper } from './simple-cache-adapter.class';

config();

const cacheAdapter: CacheAdapter = new SimpleCacheAdatper();

const officialWechat = new OfficialWechat({
  appId: process.env.APP_ID || '',
  appSecret: process.env.APP_SECRET || '',
  logger: false,
  cacheAdapter,
});

describe('OfficialWechat', () => {
  it('should get access token', async () => {
    const accessToken = await officialWechat.getAccessToken();

    // console.log(accessToken);

    expect(typeof accessToken).toEqual('string');
  });

  it('should getQrCode', async () => {
    const qrCode = await officialWechat.getQRCode('register_xxxxxx');

    // console.log(qrCode);

    expect(typeof qrCode).toEqual('string');
  });

  it('should get user info', async () => {
    const userInfo = await officialWechat.getUserInfo(process.env.OPEN_ID || '');

    // console.log(userInfo);

    expect(userInfo.openId).toEqual(process.env.OPEN_ID);
  });
});
