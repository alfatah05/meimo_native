package com.meimo.notes;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

@CapacitorPlugin(name = "MeimoFileSaver")
public class MeimoFileSaverPlugin extends Plugin {

  @PluginMethod
  public void saveToDownloads(PluginCall call) {
    String fileName = call.getString("fileName");
    String base64 = call.getString("base64");
    String mimeType = call.getString("mimeType", "application/octet-stream");

    if (fileName == null || fileName.isEmpty() || base64 == null) {
      call.reject("fileName and base64 required");
      return;
    }

    // Strip data-url prefix if present
    if (base64.contains(",")) {
      base64 = base64.substring(base64.indexOf(",") + 1);
    }

    final String finalBase64 = base64;
    final String finalName = fileName;
    final String finalMime = mimeType;

    getActivity().runOnUiThread(() -> {
      // actually IO off main — but keep simple
    });

    new Thread(() -> {
      try {
        byte[] data = Base64.decode(finalBase64, Base64.DEFAULT);
        Uri uri = null;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
          // Android 10+ MediaStore Downloads
          ContentResolver resolver = getContext().getContentResolver();
          ContentValues values = new ContentValues();
          values.put(MediaStore.Downloads.DISPLAY_NAME, finalName);
          values.put(MediaStore.Downloads.MIME_TYPE, finalMime);
          values.put(MediaStore.Downloads.IS_PENDING, 1);
          values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);

          uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
          if (uri == null) {
            call.reject("MediaStore insert returned null");
            return;
          }
          try (OutputStream out = resolver.openOutputStream(uri)) {
            if (out == null) {
              call.reject("Cannot open output stream");
              return;
            }
            out.write(data);
            out.flush();
          }
          values.clear();
          values.put(MediaStore.Downloads.IS_PENDING, 0);
          resolver.update(uri, values, null, null);
        } else {
          // Android 9 and below
          File dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
          if (!dir.exists()) dir.mkdirs();
          File file = new File(dir, finalName);
          try (FileOutputStream fos = new FileOutputStream(file)) {
            fos.write(data);
            fos.flush();
          }
          uri = Uri.fromFile(file);

          // Notify media scanner
          android.content.Intent intent =
            new android.content.Intent(android.content.Intent.ACTION_MEDIA_SCANNER_SCAN_FILE);
          intent.setData(uri);
          getContext().sendBroadcast(intent);
        }

        JSObject ret = new JSObject();
        ret.put("uri", uri != null ? uri.toString() : "");
        ret.put("path", finalName);
        ret.put("ok", true);
        call.resolve(ret);
      } catch (Exception e) {
        call.reject("saveToDownloads failed: " + e.getMessage(), e);
      }
    }).start();
  }
}
