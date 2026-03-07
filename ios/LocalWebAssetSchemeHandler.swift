import Foundation
import WebKit

enum LocalWebRuntimeConstants {
  static let assetScheme = "app-asset"
  static let assetHost = "assets"
  static let bridgeHandlerName = "LocalWebRuntimeBridge"
  static let nativeMessageEventName = "local-web-runtime:native-message"
}

final class LocalWebAssetSchemeHandler: NSObject, WKURLSchemeHandler {
  func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
    guard let url = task.request.url else {
      fail(task, code: 400)
      return
    }

    guard url.host == LocalWebRuntimeConstants.assetHost else {
      fail(task, code: 404)
      return
    }

    let relativePath = url.path.hasPrefix("/") ? String(url.path.dropFirst()) : url.path
    guard !relativePath.isEmpty else {
      fail(task, code: 404)
      return
    }

    let filePath = (Bundle.main.bundlePath as NSString).appendingPathComponent(relativePath)
    guard let data = try? Data(contentsOf: URL(fileURLWithPath: filePath)) else {
      fail(task, code: 404, "Asset not found: \(relativePath)")
      return
    }

    let mimeType = resolveMimeType(for: relativePath)
    let cacheControl = relativePath.hasSuffix(".html")
      ? "no-cache"
      : "public, max-age=31536000, immutable"

    let response = HTTPURLResponse(
      url: url,
      statusCode: 200,
      httpVersion: "HTTP/1.1",
      headerFields: [
        "Content-Type": mimeType,
        "Cache-Control": cacheControl,
        "Content-Length": "\(data.count)",
      ]
    )!

    task.didReceive(response)
    task.didReceive(data)
    task.didFinish()
  }

  func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}

  private func fail(_ task: WKURLSchemeTask, code: Int, _ message: String = "") {
    let userInfo: [String: Any]? = message.isEmpty ? nil : [NSLocalizedDescriptionKey: message]
    task.didFailWithError(
      NSError(domain: "LocalWebAssetSchemeHandler", code: code, userInfo: userInfo)
    )
  }

  private func resolveMimeType(for path: String) -> String {
    switch (path as NSString).pathExtension.lowercased() {
    case "css":
      return "text/css; charset=utf-8"
    case "html":
      return "text/html; charset=utf-8"
    case "js", "mjs":
      return "application/javascript"
    case "json":
      return "application/json"
    case "png":
      return "image/png"
    case "jpg", "jpeg":
      return "image/jpeg"
    case "svg":
      return "image/svg+xml"
    case "wasm":
      return "application/wasm"
    case "webp":
      return "image/webp"
    case "woff":
      return "font/woff"
    case "woff2":
      return "font/woff2"
    default:
      return "application/octet-stream"
    }
  }
}
