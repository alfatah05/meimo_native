package com.meimo.notes;

import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(MeimoSystemBarsPlugin.class);
    registerPlugin(MeimoFileSaverPlugin.class);
    registerPlugin(NavigationBarPlugin.class);
    registerPlugin(MeimoPermissionsPlugin.class);
    super.onCreate(savedInstanceState);

    // Matikan overscroll glow/bounce WebView (CSS overscroll-behavior sering diabaikan Android)
    try {
      WebView webView = getBridge() != null ? getBridge().getWebView() : null;
      if (webView != null) {
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);
      } else {
        // Bridge belum siap di beberapa versi — defer
        final View decor = getWindow() != null ? getWindow().getDecorView() : null;
        if (decor != null) {
          decor.post(() -> {
            try {
              if (getBridge() != null && getBridge().getWebView() != null) {
                WebView wv = getBridge().getWebView();
                wv.setOverScrollMode(View.OVER_SCROLL_NEVER);
                wv.setVerticalScrollBarEnabled(false);
                wv.setHorizontalScrollBarEnabled(false);
              }
            } catch (Exception ignored) {}
          });
        }
      }
    } catch (Exception ignored) {}
  }
}
