package com.meimo.notes;

import android.graphics.Color;
import android.os.Build;
import android.view.View;
import android.view.Window;
import android.view.WindowInsetsController;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "MeimoNavigationBar")
public class NavigationBarPlugin extends Plugin {

  @PluginMethod
  public void setColor(PluginCall call) {
    String color = call.getString("color", "#17181C");
    boolean darkButtons = call.getBoolean("darkButtons", false);

    getActivity().runOnUiThread(() -> {
      try {
        Window window = getActivity().getWindow();
        int c = Color.parseColor(color);
        window.setNavigationBarColor(c);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          View decor = window.getDecorView();
          int flags = decor.getSystemUiVisibility();
          if (darkButtons) {
            flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
          } else {
            flags &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
          }
          decor.setSystemUiVisibility(flags);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
          WindowInsetsController ctrl = window.getInsetsController();
          if (ctrl != null) {
            if (darkButtons) {
              ctrl.setSystemBarsAppearance(
                WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS,
                WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
              );
            } else {
              ctrl.setSystemBarsAppearance(
                0,
                WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
              );
            }
          }
        }
        call.resolve();
      } catch (Exception e) {
        call.reject("Failed to set navigation bar color", e);
      }
    });
  }
}
