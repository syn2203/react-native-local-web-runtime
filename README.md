# react-native-local-web-runtime

[English](./README.md) | [简体中文](./README.zh-CN.md)

Minimal React Native runtime for rendering bundled local web assets from app
bundles on iOS and Android.

This package is meant to be the shared runtime layer only. Your app still owns
the bundled `web-dist` payload and the business-level bridge protocol.

## Repository layout

- library source lives at the repository root
- runnable consumer example lives in [`example/`](./example)
- package contents are constrained by the `files` field, so `example/` is not
  published to npm

## What it does

- loads a local HTML entry file from bundled app assets
- serves local JS, CSS, WASM, image, and font files through native URL handlers
- exposes a simple RN <-> native <-> web bridge
- works without network access once your `web-dist` files are bundled

## What it does not do

- build your web app
- define your business message protocol
- own your `web-dist` files

## Installation

```bash
npm install react-native-local-web-runtime
```

or:

```bash
yarn add react-native-local-web-runtime
```

iOS:

```bash
cd ios && pod install
```

## Compatibility

- React Native: `>=0.72`
- React: `>=18`
- Node.js: `>=20.19.4`

The repository example is currently verified with Node.js 22.

## Basic usage

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

## Public API

### `LocalWebView`

Props:

- `assetRoot?: string`
  Default: `web-dist`
- `entryFile?: string`
  Default: `index.html`
- `sourceUrl?: string`
  Optional override when you want to fully control the resolved local URL
- `bridgeEnabled?: boolean`
  Default: `false`
- `outboundMessage?: string`
  JSON string forwarded from RN to the web runtime
- `runtimeFlags?: Record<string, string | number | boolean | null>`
  Extra flags injected onto `window.__LOCAL_WEB_RUNTIME_FLAGS__`
- `onBridgeMessage?: (event) => void`
  Receives raw JSON strings posted from the web runtime back to React Native

### `buildLocalWebEntryUrl(assetRoot?, entryFile?)`

Builds the platform-specific local entry URL:

- iOS: `app-asset://assets/...`
- Android: `https://appassets.androidplatform.net/assets/...`

## Asset placement

Android:

- `android/app/src/main/assets/web-dist/...`

iOS:

- copy `ios/<AppName>/assets/web-dist/...` into the app bundle during build

Example Xcode build phase:

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

## Web bridge contract

The runtime only provides transport. Your web app owns the message schema.

Available globals inside the web page:

- `window.__LOCAL_WEB_RUNTIME__`
- `window.__LOCAL_WEB_RUNTIME_FLAGS__`
- `window.LocalWebRuntime.postMessage(message)`

Messages from native to web are dispatched as:

```js
window.addEventListener('local-web-runtime:native-message', event => {
  console.log(event.detail);
});
```

## Example app

This repository includes a runnable React Native consumer app under
[`example/`](./example). It loads a bundled `web-dist` payload, shows bridge
status, and demonstrates native-to-web messages for:

- `BRIDGE_PING`
- `SET_HIGHLIGHT`
- `SET_TIME`

Typical local workflow:

```bash
cd example
npm install
cd ios && pod install
cd ..
npm run ios
```

To build the example without opening Xcode or Android Studio:

```bash
cd example/ios
xcodebuild -workspace LocalWebRuntimeExample.xcworkspace -scheme LocalWebRuntimeExample -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath build build
```

```bash
cd example/android
./gradlew assembleDebug
```

## Publishing and maintenance

- release steps: [PUBLISHING.md](./PUBLISHING.md)
- release gate: [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md)
- contribution guide: [CONTRIBUTING.md](./CONTRIBUTING.md)
- security policy: [SECURITY.md](./SECURITY.md)

Before the first public release, update the final GitHub repository metadata in
`package.json`:

- `repository`
- `bugs`
- `homepage`

## Release notes

See [CHANGELOG.md](./CHANGELOG.md) and [PUBLISHING.md](./PUBLISHING.md).
