import Foundation
import React
import UIKit
import WebKit

private final class BridgeMessageProxy: NSObject, WKScriptMessageHandler {
  weak var owner: LocalWebView?

  init(owner: LocalWebView) {
    self.owner = owner
  }

  func userContentController(
    _ userContentController: WKUserContentController,
    didReceive message: WKScriptMessage
  ) {
    owner?.handleBridgeScriptMessage(message)
  }
}

final class LocalWebView: UIView, WKNavigationDelegate {
  @objc var url: String = "" {
    didSet { attachOrLoadWebView() }
  }

  @objc var bridgeEnabled: Bool = false {
    didSet {
      configureBridge()
      applyRuntimeContext()
    }
  }

  @objc var outboundMessage: String = "" {
    didSet { sendOutboundMessageIfNeeded() }
  }

  @objc var runtimeFlagsJson: String = "{}" {
    didSet { applyRuntimeContext() }
  }

  @objc var onBridgeMessage: RCTBubblingEventBlock?

  private var bridgeProxy: BridgeMessageProxy?
  private var lastOutboundMessage: String?
  private var webView: WKWebView?

  override init(frame: CGRect) {
    super.init(frame: frame)
    backgroundColor = .black
  }

  @available(*, unavailable)
  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  deinit {
    webView?.configuration.userContentController.removeScriptMessageHandler(
      forName: LocalWebRuntimeConstants.bridgeHandlerName
    )
    webView?.navigationDelegate = nil
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    webView?.frame = bounds
  }

  func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
    applyRuntimeContext()
    sendOutboundMessageIfNeeded()
  }

  private func makeWebView() -> WKWebView {
    let controller = WKUserContentController()
    let bootstrapScript = """
    window.__LOCAL_WEB_RUNTIME__ = window.__LOCAL_WEB_RUNTIME__ || {
      version: 1,
      platform: 'ios',
      bridgeEnabled: false,
      nativeMessageEvent: '\(LocalWebRuntimeConstants.nativeMessageEventName)'
    };
    window.__LOCAL_WEB_RUNTIME_FLAGS__ = window.__LOCAL_WEB_RUNTIME_FLAGS__ || {};
    window.LocalWebRuntime = window.LocalWebRuntime || {};
    window.LocalWebRuntime.postMessage = function(message) {
      try {
        var raw = typeof message === 'string' ? message : JSON.stringify(message);
        var bridge = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.\(LocalWebRuntimeConstants.bridgeHandlerName);
        if (bridge) {
          bridge.postMessage(raw);
        }
      } catch (error) {}
    };
    """
    controller.addUserScript(
      WKUserScript(
        source: bootstrapScript,
        injectionTime: .atDocumentStart,
        forMainFrameOnly: true
      )
    )

    let configuration = WKWebViewConfiguration()
    configuration.userContentController = controller
    configuration.setURLSchemeHandler(
      LocalWebAssetSchemeHandler(),
      forURLScheme: LocalWebRuntimeConstants.assetScheme
    )
    configuration.defaultWebpagePreferences.allowsContentJavaScript = true

    let webView = WKWebView(frame: bounds, configuration: configuration)
    webView.navigationDelegate = self
    webView.isOpaque = false
    webView.backgroundColor = .black
    webView.scrollView.backgroundColor = .black
    webView.scrollView.bounces = false
    webView.scrollView.contentInsetAdjustmentBehavior = .never
    webView.scrollView.pinchGestureRecognizer?.isEnabled = false
    if #available(iOS 15.0, *) {
      webView.underPageBackgroundColor = .black
    }
    return webView
  }

  private func attachOrLoadWebView() {
    guard !url.isEmpty, let target = URL(string: url) else {
      return
    }

    if webView == nil {
      let instance = makeWebView()
      instance.frame = bounds
      addSubview(instance)
      webView = instance
      configureBridge()
    }

    guard let instance = webView else {
      return
    }

    if instance.url != target {
      instance.load(URLRequest(url: target))
    }

    applyRuntimeContext()
    sendOutboundMessageIfNeeded()
  }

  private func configureBridge() {
    guard let webView else {
      return
    }

    let controller = webView.configuration.userContentController
    controller.removeScriptMessageHandler(forName: LocalWebRuntimeConstants.bridgeHandlerName)
    bridgeProxy = nil

    guard bridgeEnabled else {
      return
    }

    let proxy = BridgeMessageProxy(owner: self)
    controller.add(proxy, name: LocalWebRuntimeConstants.bridgeHandlerName)
    bridgeProxy = proxy
  }

  private func isAllowedURL(_ url: URL?) -> Bool {
    guard let url else {
      return false
    }

    if url.scheme == LocalWebRuntimeConstants.assetScheme {
      return url.host == LocalWebRuntimeConstants.assetHost
    }

    return url.scheme == "https" && url.host == "appassets.androidplatform.net"
  }

  private func applyRuntimeContext() {
    guard let webView, isAllowedURL(webView.url) else {
      return
    }

    let bridgeEnabledLiteral = bridgeEnabled ? "true" : "false"
    let script = """
    (function() {
      window.__LOCAL_WEB_RUNTIME__ = {
        version: 1,
        platform: 'ios',
        bridgeEnabled: \(bridgeEnabledLiteral),
        nativeMessageEvent: '\(LocalWebRuntimeConstants.nativeMessageEventName)'
      };
      window.__LOCAL_WEB_RUNTIME_FLAGS__ = \(runtimeFlagsJson.isEmpty ? "{}" : runtimeFlagsJson);
      window.LocalWebRuntime = window.LocalWebRuntime || {};
      window.LocalWebRuntime.postMessage = function(message) {
        if (!\(bridgeEnabledLiteral)) {
          return;
        }
        try {
          var raw = typeof message === 'string' ? message : JSON.stringify(message);
          var bridge = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.\(LocalWebRuntimeConstants.bridgeHandlerName);
          if (bridge) {
            bridge.postMessage(raw);
          }
        } catch (error) {}
      };
    })();
    """

    webView.evaluateJavaScript(script, completionHandler: nil)
  }

  private func dispatchNativeMessageToWeb(_ json: String) -> Bool {
    guard bridgeEnabled, let webView, isAllowedURL(webView.url) else {
      return false
    }

    let encoded = Data(json.utf8).base64EncodedString()
    let script = """
    (function() {
      try {
        var raw = atob('\(encoded)');
        var message = JSON.parse(raw);
        window.dispatchEvent(new CustomEvent('\(LocalWebRuntimeConstants.nativeMessageEventName)', { detail: message }));
      } catch (error) {}
    })();
    """

    webView.evaluateJavaScript(script, completionHandler: nil)
    return true
  }

  private func sendOutboundMessageIfNeeded() {
    guard !outboundMessage.isEmpty, outboundMessage != lastOutboundMessage else {
      return
    }

    if dispatchNativeMessageToWeb(outboundMessage) {
      lastOutboundMessage = outboundMessage
    }
  }

  private func forwardInboundMessage(_ raw: String) {
    onBridgeMessage?(["data": raw])
  }

  fileprivate func handleBridgeScriptMessage(_ message: WKScriptMessage) {
    guard bridgeEnabled, message.name == LocalWebRuntimeConstants.bridgeHandlerName else {
      return
    }

    guard let webView, isAllowedURL(webView.url) else {
      return
    }

    if let raw = message.body as? String {
      forwardInboundMessage(raw)
      return
    }

    guard JSONSerialization.isValidJSONObject(message.body),
          let data = try? JSONSerialization.data(withJSONObject: message.body, options: []),
          let raw = String(data: data, encoding: .utf8) else {
      return
    }

    forwardInboundMessage(raw)
  }
}
