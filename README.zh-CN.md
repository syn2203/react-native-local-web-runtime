# react-native-local-web-runtime

[English](./README.md) | [简体中文](./README.zh-CN.md)

一个用于 React Native 的轻量本地 Web 运行时，支持在 iOS 和 Android
中直接加载打包进应用内的本地网页资源。

这个库只负责共享运行时能力。你的业务应用仍然需要自己维护 `web-dist`
资源，以及网页和 React Native 之间的业务消息协议。

## 仓库结构

- 库源码位于仓库根目录
- 可运行的示例应用位于 [`example/`](./example)
- npm 发布内容由根目录 `package.json` 的 `files` 字段控制，因此
  `example/` 不会发布到 npm

## 这个库能做什么

- 从应用内置资源中加载本地 HTML 入口文件
- 通过原生 URL 处理器提供本地 JS、CSS、WASM、图片和字体资源
- 提供一个简洁的 RN <-> native <-> web 桥接通道
- 在 `web-dist` 已打包进应用后支持离线运行

## 这个库不做什么

- 不负责构建你的 Web 应用
- 不定义你的业务层消息协议
- 不托管你的 `web-dist` 资源

## 安装

```bash
npm install react-native-local-web-runtime
```

或者：

```bash
yarn add react-native-local-web-runtime
```

iOS:

```bash
cd ios && pod install
```

## 兼容性

- React Native: `>=0.72`
- React: `>=18`
- Node.js: `>=20.19.4`

当前仓库内的 example 已用 Node.js 22 验证通过。

## 基础用法

```tsx
import {
  LocalWebView,
  buildLocalWebEntryUrl,
} from 'react-native-local-web-runtime';

const entryUrl = buildLocalWebEntryUrl('web-dist', 'index.html');

<LocalWebView
  assetRoot="web-dist"
  entryFile="index.html"
  bridgeEnabled
  onBridgeMessage={event => {
    console.log(event.nativeEvent.data);
  }}
/>;
```

## 公开 API

### `LocalWebView`

属性：

- `assetRoot?: string`
  默认值：`web-dist`
- `entryFile?: string`
  默认值：`index.html`
- `sourceUrl?: string`
  可选覆盖项，用于完全自定义本地入口 URL
- `bridgeEnabled?: boolean`
  默认值：`false`
- `outboundMessage?: string`
  从 React Native 发往网页运行时的 JSON 字符串
- `runtimeFlags?: Record<string, string | number | boolean | null>`
  会被注入到 `window.__LOCAL_WEB_RUNTIME_FLAGS__`
- `onBridgeMessage?: (event) => void`
  接收从网页回传到 React Native 的原始 JSON 字符串

### `buildLocalWebEntryUrl(assetRoot?, entryFile?)`

用于生成平台相关的本地入口 URL：

- iOS: `app-asset://assets/...`
- Android: `https://appassets.androidplatform.net/assets/...`

## 资源放置方式

Android：

- `android/app/src/main/assets/web-dist/...`

iOS：

- 在构建时把 `ios/<AppName>/assets/web-dist/...` 拷贝进 app bundle

示例 Xcode Build Phase：

```sh
set -eu

WEB_DIST_SRC="${PROJECT_DIR}/MyApp/assets/web-dist"
WEB_DIST_DST="${TARGET_BUILD_DIR}/${UNLOCALIZED_RESOURCES_FOLDER_PATH}/web-dist"

if [ ! -d "$WEB_DIST_SRC" ]; then
  echo "warning: Missing web-dist: $WEB_DIST_SRC"
  exit 0
fi

rm -rf "$WEB_DIST_DST"
mkdir -p "$WEB_DIST_DST"
rsync -a --delete "$WEB_DIST_SRC/" "$WEB_DIST_DST/"
```

## Web 桥接约定

运行时只提供传输层，具体消息结构由你的 Web 应用自己定义。

网页中可用的全局对象：

- `window.__LOCAL_WEB_RUNTIME__`
- `window.__LOCAL_WEB_RUNTIME_FLAGS__`
- `window.LocalWebRuntime.postMessage(message)`

原生发往网页的消息会以以下事件形式分发：

```js
window.addEventListener('local-web-runtime:native-message', event => {
  console.log(event.detail);
});
```

## 示例应用

仓库内置了一个可运行的 React Native 消费方示例，位于
[`example/`](./example)。它会加载本地打包的 `web-dist` 内容，展示桥接
状态，并演示以下原生到 Web 的消息：

- `BRIDGE_PING`
- `SET_HIGHLIGHT`
- `SET_TIME`

典型本地开发流程：

```bash
cd example
npm install
cd ios && pod install
cd ..
npm run ios
```

如果不打开 Xcode 或 Android Studio，也可以直接构建：

```bash
cd example/ios
xcodebuild -workspace LocalWebRuntimeExample.xcworkspace -scheme LocalWebRuntimeExample -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath build build
```

```bash
cd example/android
./gradlew assembleDebug
```

## 发布与维护

- 发布步骤：[PUBLISHING.md](./PUBLISHING.md)
- 发布检查清单：[RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md)
- 贡献说明：[CONTRIBUTING.md](./CONTRIBUTING.md)
- 安全策略：[SECURITY.md](./SECURITY.md)

首次公开发布前，请确认 `package.json` 中的 GitHub 仓库元数据已经填写：

- `repository`
- `bugs`
- `homepage`

## 更新记录

详见 [CHANGELOG.md](./CHANGELOG.md) 和 [PUBLISHING.md](./PUBLISHING.md)。
