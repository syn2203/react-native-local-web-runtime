const {LocalWebView, isLocalWebViewAvailable} = require('./LocalWebView');
const {
  ANDROID_ASSET_HOST,
  ANDROID_ASSET_SCHEME,
  IOS_ASSET_HOST,
  IOS_ASSET_SCHEME,
  buildLocalWebEntryUrl,
} = require('./url');

const LOCAL_WEB_NATIVE_MESSAGE_EVENT_NAME = 'local-web-runtime:native-message';
const LOCAL_WEB_RUNTIME_GLOBAL = '__LOCAL_WEB_RUNTIME__';
const LOCAL_WEB_RUNTIME_FLAGS_GLOBAL = '__LOCAL_WEB_RUNTIME_FLAGS__';

module.exports = {
  ANDROID_ASSET_HOST,
  ANDROID_ASSET_SCHEME,
  IOS_ASSET_HOST,
  IOS_ASSET_SCHEME,
  LOCAL_WEB_NATIVE_MESSAGE_EVENT_NAME,
  LOCAL_WEB_RUNTIME_FLAGS_GLOBAL,
  LOCAL_WEB_RUNTIME_GLOBAL,
  LocalWebView,
  buildLocalWebEntryUrl,
  isLocalWebViewAvailable,
};
