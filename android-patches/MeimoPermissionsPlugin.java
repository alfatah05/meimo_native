package com.meimo.app;

import android.Manifest;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.getcapacitor.PermissionState;

@CapacitorPlugin(
  name = "MeimoPermissions",
  permissions = {
    @Permission(
      alias = "microphone",
      strings = { Manifest.permission.RECORD_AUDIO }
    )
  }
)
public class MeimoPermissionsPlugin extends Plugin {

  @PluginMethod
  public void requestMicrophone(PluginCall call) {
    if (getPermissionState("microphone") == PermissionState.GRANTED) {
      JSObject ret = new JSObject();
      ret.put("granted", true);
      call.resolve(ret);
      return;
    }
    // Tampilkan dialog sistem
    requestPermissionForAlias("microphone", call, "micPermCallback");
  }

  @PermissionCallback
  private void micPermCallback(PluginCall call) {
    boolean granted = getPermissionState("microphone") == PermissionState.GRANTED;
    JSObject ret = new JSObject();
    ret.put("granted", granted);
    call.resolve(ret);
  }

  @PluginMethod
  public void checkMicrophone(PluginCall call) {
    boolean granted = getPermissionState("microphone") == PermissionState.GRANTED;
    JSObject ret = new JSObject();
    ret.put("granted", granted);
    call.resolve(ret);
  }
}
