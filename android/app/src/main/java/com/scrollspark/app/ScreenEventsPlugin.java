package com.scrollspark.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Forwards {@link Intent#ACTION_SCREEN_OFF} and {@link Intent#ACTION_SCREEN_ON} to JS as
 * {@code screenStateChange} with {@code { state: "off" | "on" }}.
 */
@CapacitorPlugin(name = "ScreenEvents")
public class ScreenEventsPlugin extends Plugin {

    private BroadcastReceiver receiver;
    private boolean registered;

    @Override
    public void load() {
        super.load();
        receiver =
            new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    if (intent == null || intent.getAction() == null) {
                        return;
                    }
                    String action = intent.getAction();
                    JSObject data = new JSObject();
                    if (Intent.ACTION_SCREEN_OFF.equals(action)) {
                        data.put("state", "off");
                        notifyListeners("screenStateChange", data);
                    } else if (Intent.ACTION_SCREEN_ON.equals(action)) {
                        data.put("state", "on");
                        notifyListeners("screenStateChange", data);
                    }
                }
            };

        IntentFilter filter = new IntentFilter();
        filter.addAction(Intent.ACTION_SCREEN_OFF);
        filter.addAction(Intent.ACTION_SCREEN_ON);

        Context ctx = getContext();
        if (ctx == null) {
            return;
        }

        try {
            ContextCompat.registerReceiver(ctx, receiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED);
            registered = true;
        } catch (Exception e) {
            android.util.Log.e("ScreenEventsPlugin", "registerReceiver failed", e);
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (registered && receiver != null) {
            try {
                Context ctx = getContext();
                if (ctx != null) {
                    ctx.unregisterReceiver(receiver);
                }
            } catch (IllegalArgumentException ignored) {
                // Already unregistered
            }
            registered = false;
            receiver = null;
        }
        super.handleOnDestroy();
    }
}
