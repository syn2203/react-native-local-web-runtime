package com.localwebruntime

import android.content.Context
import android.graphics.Color
import android.graphics.Bitmap
import android.net.Uri
import android.util.Base64
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.uimanager.events.Event
import java.lang.ref.WeakReference
import java.net.URLConnection
import java.nio.charset.StandardCharsets

class LocalWebViewManager : SimpleViewManager<LocalWebViewManager.BridgeWebView>() {
  companion object {
    private const val ASSET_SCHEME = "https"
    private const val ASSET_HOST = "appassets.androidplatform.net"
    private const val ASSET_PREFIX = "/assets/"
    private const val BRIDGE_INTERFACE = "LocalWebRuntimeBridgeAndroid"
    private const val BRIDGE_EVENT_NAME = "local-web-runtime:native-message"
  }

  class BridgeWebView(context: Context) : WebView(context) {
    var bridgeEnabled: Boolean = false
    var lastOutboundMessage: String? = null
    var runtimeFlagsJson: String = "{}"
  }

  private class LocalWebBridgeMessageEvent(
    surfaceId: Int,
    viewId: Int,
    private val raw: String,
  ) : Event<LocalWebBridgeMessageEvent>(surfaceId, viewId) {
    override fun getEventName(): String = EVENT_NAME

    override fun canCoalesce(): Boolean = false

    override fun getEventData(): WritableMap =
      Arguments.createMap().apply {
        putString("data", raw)
      }

    companion object {
      const val EVENT_NAME = "topBridgeMessage"
    }
  }

  override fun getName(): String = "LocalWebView"

  override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> {
    return mutableMapOf(
      LocalWebBridgeMessageEvent.EVENT_NAME to
        mutableMapOf("registrationName" to "onBridgeMessage"),
    )
  }

  override fun createViewInstance(reactContext: ThemedReactContext): BridgeWebView {
    return BridgeWebView(reactContext).apply {
      setBackgroundColor(Color.BLACK)
      configureSettings(settings)
      overScrollMode = WebView.OVER_SCROLL_NEVER

      addJavascriptInterface(LocalWebBridgeJsApi(this, reactContext), BRIDGE_INTERFACE)

      webViewClient =
        object : WebViewClient() {
          override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
            return false
          }

          override fun shouldInterceptRequest(
            view: WebView?,
            request: WebResourceRequest?,
          ): WebResourceResponse? {
            return interceptRequest(reactContext, request?.url)
              ?: if (request != null) super.shouldInterceptRequest(view, request) else null
          }

          override fun shouldInterceptRequest(
            view: WebView?,
            url: String?,
          ): WebResourceResponse? {
            val uri = if (url.isNullOrBlank()) null else Uri.parse(url)
            return interceptRequest(reactContext, uri)
              ?: if (url.isNullOrBlank()) null else super.shouldInterceptRequest(view, url)
          }

          override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
            super.onPageStarted(view, url, favicon)
            injectRuntimeContext(view as? BridgeWebView)
          }

          override fun onPageFinished(view: WebView?, url: String?) {
            super.onPageFinished(view, url)
            injectRuntimeContext(view as? BridgeWebView)
          }
        }

      webChromeClient = WebChromeClient()
    }
  }

  private fun configureSettings(settings: WebSettings) {
    settings.javaScriptEnabled = true
    settings.domStorageEnabled = true
    settings.databaseEnabled = true
    settings.allowFileAccess = false
    settings.allowContentAccess = true
    settings.cacheMode = WebSettings.LOAD_DEFAULT
    settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
    settings.setSupportZoom(false)
    settings.builtInZoomControls = false
    settings.displayZoomControls = false
  }

  private fun interceptRequest(
    reactContext: ThemedReactContext,
    uri: Uri?,
  ): WebResourceResponse? {
    return mapToAssetResponse(reactContext, uri)
  }

  private fun mapToAssetResponse(
    reactContext: ThemedReactContext,
    uri: Uri?,
  ): WebResourceResponse? {
    if (uri == null || uri.scheme != ASSET_SCHEME || uri.host != ASSET_HOST) {
      return null
    }

    val encodedPath = uri.encodedPath ?: return null
    if (!encodedPath.startsWith(ASSET_PREFIX)) {
      return null
    }

    val assetPath = encodedPath.removePrefix(ASSET_PREFIX)
    if (assetPath.isBlank()) {
      return null
    }

    return try {
      val stream = reactContext.assets.open(assetPath)
      val mimeType = resolveMimeType(assetPath)
      val encoding = resolveEncoding(mimeType)
      val response = WebResourceResponse(mimeType, encoding, stream)
      response.responseHeaders = cacheHeadersFor(assetPath)
      response
    } catch (_: Exception) {
      null
    }
  }

  private fun resolveMimeType(assetPath: String): String {
    return when (assetPath.substringAfterLast('.', "").lowercase()) {
      "css" -> "text/css"
      "html" -> "text/html"
      "js", "mjs" -> "application/javascript"
      "json" -> "application/json"
      "svg" -> "image/svg+xml"
      "wasm" -> "application/wasm"
      "webp" -> "image/webp"
      "woff" -> "font/woff"
      "woff2" -> "font/woff2"
      else -> URLConnection.guessContentTypeFromName(assetPath) ?: "application/octet-stream"
    }
  }

  private fun resolveEncoding(mimeType: String): String? {
    return if (isUtf8MimeType(mimeType)) "UTF-8" else null
  }

  private fun isUtf8MimeType(mimeType: String): Boolean {
    return (
      mimeType.startsWith("text/") ||
        mimeType.contains("javascript") ||
        mimeType.contains("json") ||
        mimeType.contains("xml")
      )
  }

  private fun cacheHeadersFor(assetPath: String): Map<String, String> {
    return if (assetPath.endsWith(".html")) {
      mapOf("Cache-Control" to "no-cache")
    } else {
      mapOf("Cache-Control" to "public, max-age=31536000, immutable")
    }
  }

  private fun isAllowedUrl(url: String?): Boolean {
    if (url.isNullOrBlank()) {
      return false
    }

    val uri = Uri.parse(url)
    return uri.scheme == ASSET_SCHEME && uri.host == ASSET_HOST
  }

  private fun isBridgeAllowed(view: BridgeWebView): Boolean {
    return view.bridgeEnabled && isAllowedUrl(view.url)
  }

  private fun injectRuntimeContext(view: BridgeWebView?) {
    if (view == null || !isAllowedUrl(view.url)) {
      return
    }

    val bridgeEnabledLiteral = if (view.bridgeEnabled) "true" else "false"
    val flagsJson = view.runtimeFlagsJson.ifBlank { "{}" }
    val script =
      """
      (function() {
        window.__LOCAL_WEB_RUNTIME__ = {
          version: 1,
          platform: 'android',
          bridgeEnabled: $bridgeEnabledLiteral,
          nativeMessageEvent: '$BRIDGE_EVENT_NAME'
        };
        window.__LOCAL_WEB_RUNTIME_FLAGS__ = $flagsJson;
        window.LocalWebRuntime = window.LocalWebRuntime || {};
        window.LocalWebRuntime.postMessage = function(message) {
          if (!$bridgeEnabledLiteral) {
            return;
          }
          try {
            var raw = typeof message === 'string' ? message : JSON.stringify(message);
            $BRIDGE_INTERFACE.postMessage(raw);
          } catch (error) {}
        };
      })();
      """.trimIndent()

    view.evaluateJavascript(script, null)
  }

  private fun dispatchNativeMessageToWeb(view: BridgeWebView, raw: String): Boolean {
    if (!isBridgeAllowed(view)) {
      return false
    }

    val encoded =
      Base64.encodeToString(raw.toByteArray(StandardCharsets.UTF_8), Base64.NO_WRAP)
    val script =
      """
      (function() {
        try {
          var raw = atob('$encoded');
          var message = JSON.parse(raw);
          window.dispatchEvent(new CustomEvent('$BRIDGE_EVENT_NAME', { detail: message }));
        } catch (error) {}
      })();
      """.trimIndent()

    view.evaluateJavascript(script, null)
    return true
  }

  private fun emitBridgeEvent(
    context: ReactContext,
    view: BridgeWebView,
    raw: String,
  ) {
    UIManagerHelper.getEventDispatcherForReactTag(context, view.id)?.dispatchEvent(
      LocalWebBridgeMessageEvent(UIManagerHelper.getSurfaceId(view), view.id, raw),
    )
  }

  private inner class LocalWebBridgeJsApi(
    view: BridgeWebView,
    reactContext: ThemedReactContext,
  ) {
    private val viewRef = WeakReference(view)
    private val contextRef = WeakReference(reactContext)

    @JavascriptInterface
    fun postMessage(raw: String?) {
      val payload = raw ?: return
      val view = viewRef.get() ?: return
      val context = contextRef.get() ?: return
      context.runOnUiQueueThread {
        if (!isBridgeAllowed(view)) {
          return@runOnUiQueueThread
        }
        emitBridgeEvent(context, view, payload)
      }
    }
  }

  @ReactProp(name = "bridgeEnabled", defaultBoolean = false)
  fun setBridgeEnabled(view: BridgeWebView, bridgeEnabled: Boolean) {
    view.bridgeEnabled = bridgeEnabled
    injectRuntimeContext(view)
  }

  @ReactProp(name = "url")
  fun setUrl(view: BridgeWebView, url: String?) {
    if (!url.isNullOrBlank() && url != view.url) {
      view.loadUrl(url)
    }
  }

  @ReactProp(name = "runtimeFlagsJson")
  fun setRuntimeFlagsJson(view: BridgeWebView, runtimeFlagsJson: String?) {
    view.runtimeFlagsJson = if (runtimeFlagsJson.isNullOrBlank()) "{}" else runtimeFlagsJson
    injectRuntimeContext(view)
  }

  @ReactProp(name = "outboundMessage")
  fun setOutboundMessage(view: BridgeWebView, outboundMessage: String?) {
    if (outboundMessage.isNullOrBlank() || outboundMessage == view.lastOutboundMessage) {
      return
    }

    if (dispatchNativeMessageToWeb(view, outboundMessage)) {
      view.lastOutboundMessage = outboundMessage
    }
  }

  override fun onDropViewInstance(view: BridgeWebView) {
    view.stopLoading()
    view.loadUrl("about:blank")
    view.webChromeClient = WebChromeClient()
    view.webViewClient = WebViewClient()
    view.destroy()
    super.onDropViewInstance(view)
  }
}
