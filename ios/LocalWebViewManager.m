#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE(LocalWebViewManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(url, NSString)
RCT_EXPORT_VIEW_PROPERTY(bridgeEnabled, BOOL)
RCT_EXPORT_VIEW_PROPERTY(outboundMessage, NSString)
RCT_EXPORT_VIEW_PROPERTY(runtimeFlagsJson, NSString)
RCT_EXPORT_VIEW_PROPERTY(onBridgeMessage, RCTBubblingEventBlock)

@end
