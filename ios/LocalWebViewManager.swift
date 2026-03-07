import React
import UIKit

@objc(LocalWebViewManager)
final class LocalWebViewManager: RCTViewManager {
  override func view() -> UIView! {
    LocalWebView()
  }

  override static func requiresMainQueueSetup() -> Bool {
    true
  }
}
