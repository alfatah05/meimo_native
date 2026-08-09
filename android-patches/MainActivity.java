package com.meimo.notes;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(MeimoSystemBarsPlugin.class);
    registerPlugin(MeimoFileSaverPlugin.class);
    registerPlugin(NavigationBarPlugin.class);
    super.onCreate(savedInstanceState);
  }
}
