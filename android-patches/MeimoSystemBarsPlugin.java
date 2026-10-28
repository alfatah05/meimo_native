package com.meimo.app.v2;

import android.graphics.Color;
import android.os.Build;
import android.view.View;
import android.view.Window;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "MeimoSystemBars")
public class MeimoSystemBarsPlugin extends Plugin {

  @PluginMethod
  public void setColors(PluginCall call) {
    final String color = call.getString("color", "#17181C");
    final boolean darkIcons = Boolean.TRUE.equals(call.getBoolean("darkIcons", false));

    getActivity().runOnUiThread(() -> {
      try {
        Window window = getActivity().getWindow();
        int c = Color.parseColor(color);

        // Pastikan bisa warnai system bars
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
          window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
          window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
          window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION);
          window.setStatusBarColor(c);
          window.setNavigationBarColor(c);
        }

        View decor = window.getDecorView();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
          WindowInsetsController ctrl = window.getInsetsController();
          if (ctrl != null) {
            int mask =
              WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
            if (darkIcons) {
              ctrl.setSystemBarsAppearance(mask, mask);
            } else {
              ctrl.setSystemBarsAppearance(0, mask);
            }
          }
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          int flags = decor.getSystemUiVisibility();
          if (darkIcons) {
            flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
          } else {
            flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            flags &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
          }
          decor.setSystemUiVisibility(flags);
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
          int flags = decor.getSystemUiVisibility();
          if (darkIcons) {
            flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
          } else {
            flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
          }
          decor.setSystemUiVisibility(flags);
        }

        call.resolve();
      } catch (Exception e) {
        call.reject("setColors failed: " + e.getMessage(), e);
      }
    });
  }
}
