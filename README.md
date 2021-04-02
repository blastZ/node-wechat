# Node-WeChat

Node wechat sdk, including these modules:

- OfficialWeChat

## Install

```bash
npm install @blastz/node-wechat
```

## OfficialWeChat API

Module `OfficialWeChat` is created for [official account](https://developers.weixin.qq.com/doc/offiaccount/Getting_Started/Overview.html).

```ts
import { OfficialWeChat } from '@blastz/node-wechat';

const officialWeChat = new OfficialWeChat({
  appId,
  appSecret,
  logger,
  cacheAdapter,
});
```

### .getTempQRCode(sceneStr)

Get temp qr code with scene string, the result is base64 image data.

parameters:

- sceneStr {String} custom scene string

### .getUserInfo(openId)

Get user detail by openId.

parameters:

- openId {String} wechat open id
