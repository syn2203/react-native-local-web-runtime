const React = require('react');
const {
  StyleSheet,
  UIManager,
  View,
  requireNativeComponent,
} = require('react-native');

const {buildLocalWebEntryUrl} = require('./url');

const COMPONENT_NAME = 'LocalWebView';
const NativeLocalWebView =
  UIManager.getViewManagerConfig(COMPONENT_NAME) != null
    ? requireNativeComponent(COMPONENT_NAME)
    : null;

const isLocalWebViewAvailable = NativeLocalWebView != null;

function LocalWebView({
  assetRoot = 'web-dist',
  bridgeEnabled = false,
  children,
  entryFile = 'index.html',
  onBridgeMessage,
  outboundMessage,
  runtimeFlags,
  sourceUrl,
  style,
  ...rest
}) {
  const runtimeFlagsJson = React.useMemo(
    () => JSON.stringify(runtimeFlags ?? {}),
    [runtimeFlags],
  );
  const resolvedUrl = sourceUrl ?? buildLocalWebEntryUrl(assetRoot, entryFile);

  return React.createElement(
    View,
    {style: [styles.container, style], ...rest},
    NativeLocalWebView
      ? React.createElement(NativeLocalWebView, {
          bridgeEnabled,
          onBridgeMessage,
          outboundMessage: outboundMessage ?? '',
          runtimeFlagsJson,
          style: StyleSheet.absoluteFill,
          url: resolvedUrl,
        })
      : React.createElement(View, {style: styles.fallback}),
    children,
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  fallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
});

module.exports = {
  LocalWebView,
  isLocalWebViewAvailable,
};
