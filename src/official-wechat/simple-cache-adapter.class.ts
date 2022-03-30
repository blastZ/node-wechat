import { CacheAdapter } from './official-wechat.interface';

export class SimpleCacheAdatper implements CacheAdapter {
  private store: Record<string, string | null> = {};
  private accessTokenTimer?: NodeJS.Timeout;
  private qrCodeTimer?: NodeJS.Timeout;

  setAccessToken(key: string, value: string, ttl: number) {
    this.store[key] = value;

    if (this.accessTokenTimer) {
      clearTimeout(this.accessTokenTimer);

      this.accessTokenTimer = setTimeout(() => {
        this.store[key] = null;
      }, ttl * 1000);
    }
  }

  getAccessToken(key: string) {
    return this.store[key];
  }

  deleteAccessToken(key: string) {
    this.store[key] = null;

    this.accessTokenTimer && clearTimeout(this.accessTokenTimer);
  }

  setQRCode(key: string, value: string, ttl: number) {
    this.store[key] = value;

    if (this.qrCodeTimer) {
      clearTimeout(this.qrCodeTimer);

      this.qrCodeTimer = setTimeout(() => {
        this.store[key] = null;
      }, ttl * 1000);
    }
  }

  getQRCode(key: string) {
    return this.store[key];
  }
}
