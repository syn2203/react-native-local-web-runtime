import type * as React from 'react';
import type {
  NativeSyntheticEvent,
  StyleProp,
  ViewProps,
  ViewStyle,
} from 'react-native';

export interface LocalWebBridgeEvent {
  data: string;
}

export type LocalWebRuntimeFlag = string | number | boolean | null;
export type LocalWebRuntimeFlags = Record<string, LocalWebRuntimeFlag>;

export interface LocalWebViewProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
  assetRoot?: string;
  entryFile?: string;
  sourceUrl?: string;
  bridgeEnabled?: boolean;
  outboundMessage?: string;
  runtimeFlags?: LocalWebRuntimeFlags;
  children?: React.ReactNode;
  onBridgeMessage?: (
    event: NativeSyntheticEvent<LocalWebBridgeEvent>,
  ) => void;
}

export declare const IOS_ASSET_SCHEME: string;
export declare const IOS_ASSET_HOST: string;
export declare const ANDROID_ASSET_SCHEME: string;
export declare const ANDROID_ASSET_HOST: string;
export declare const LOCAL_WEB_NATIVE_MESSAGE_EVENT_NAME: string;
export declare const LOCAL_WEB_RUNTIME_GLOBAL: string;
export declare const LOCAL_WEB_RUNTIME_FLAGS_GLOBAL: string;
export declare const isLocalWebViewAvailable: boolean;

export declare function buildLocalWebEntryUrl(
  assetRoot?: string,
  entryFile?: string,
): string;

export declare function LocalWebView(props: LocalWebViewProps): React.JSX.Element;
