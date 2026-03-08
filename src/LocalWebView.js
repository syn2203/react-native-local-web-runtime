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
const CUSTOM_VIEW_PROPS = [
  'assetRoot',
  'bridgeEnabled',
  'children',
  'entryFile',
  'onBridgeMessage',
  'outboundMessage',
  'runtimeFlags',
  'sourceUrl',
];

function buildContainerProps(props, style) {
  const viewProps = Object.assign({}, props, {style});

  CUSTOM_VIEW_PROPS.forEach(propName => {
    delete viewProps[propName];
  });

  return viewProps;
}

function buildNativeProps(config) {
  return {
    bridgeEnabled: config.bridgeEnabled,
    onBridgeMessage: config.onBridgeMessage,
    outboundMessage: config.outboundMessage == null ? '' : config.outboundMessage,
    runtimeFlagsJson: JSON.stringify(config.runtimeFlags || {}),
    style: config.style,
    url: config.sourceUrl || buildLocalWebEntryUrl(config.assetRoot, config.entryFile),
  };
}

function renderFallback(style) {
  return React.createElement(View, {
    style: [styles.fallback, style],
  });
}

function renderNativeView(nativeProps) {
  if (!NativeLocalWebView) {
    return renderFallback(nativeProps.style);
  }

  return React.createElement(NativeLocalWebView, nativeProps);
}

function LocalWebView(props) {
  const {
    assetRoot = 'web-dist',
    bridgeEnabled = false,
    children,
    entryFile = 'index.html',
    onBridgeMessage,
    outboundMessage,
    runtimeFlags,
    sourceUrl,
    style,
  } = props;
  const nativeProps = buildNativeProps({
    assetRoot,
    bridgeEnabled,
    entryFile,
    onBridgeMessage,
    outboundMessage,
    runtimeFlags,
    sourceUrl,
    style,
  });

  if (children == null) {
    return renderNativeView(nativeProps);
  }

  return React.createElement(
    View,
    buildContainerProps(props, [styles.container, style]),
    renderNativeView(Object.assign({}, nativeProps, {style: StyleSheet.absoluteFill})),
    children,
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  fallback: Object.assign({}, StyleSheet.absoluteFillObject, {
    backgroundColor: '#000000',
  }),
});

module.exports = {
  LocalWebView,
  isLocalWebViewAvailable,
};
