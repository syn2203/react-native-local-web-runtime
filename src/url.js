const {Platform} = require('react-native');

const IOS_ASSET_SCHEME = 'app-asset';
const IOS_ASSET_HOST = 'assets';
const ANDROID_ASSET_SCHEME = 'https';
const ANDROID_ASSET_HOST = 'appassets.androidplatform.net';

function trimSlashes(value) {
  return value.replace(/^\/+|\/+$/g, '');
}

function trimLeadingSlashes(value) {
  return value.replace(/^\/+/g, '');
}

function buildLocalWebEntryUrl(assetRoot = 'web-dist', entryFile = 'index.html') {
  const normalizedAssetRoot = trimSlashes(assetRoot || 'web-dist') || 'web-dist';
  const normalizedEntryFile =
    trimLeadingSlashes(entryFile || 'index.html') || 'index.html';
  const assetPath = `${normalizedAssetRoot}/${normalizedEntryFile}`;

  if (Platform.OS === 'ios') {
    return `${IOS_ASSET_SCHEME}://${IOS_ASSET_HOST}/${assetPath}`;
  }

  return `${ANDROID_ASSET_SCHEME}://${ANDROID_ASSET_HOST}/assets/${assetPath}`;
}

module.exports = {
  ANDROID_ASSET_HOST,
  ANDROID_ASSET_SCHEME,
  IOS_ASSET_HOST,
  IOS_ASSET_SCHEME,
  buildLocalWebEntryUrl,
};
