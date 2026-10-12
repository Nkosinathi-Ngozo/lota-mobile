import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";

import { useAuth } from "@/hooks/useAuth";
import { lastRegisteredPushToken, registerDevicePushToken } from "@/lib/pushToken";

// Show the banner and play the sound even while the app is open: a push is a
// nudge about something that just happened, not something to hide because
// the app happens to be in front.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Must match `defaultChannel` of the expo-notifications plugin in app.json.
// Android fixes a channel's importance when it is first created, so it is
// created before the first token is requested.
const ANDROID_CHANNEL_ID = "default";

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
  try {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: "Asset alerts",
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: "#1976D2",
      sound: "default",
      enableVibrate: true,
    });
  } catch (error) {
    // A missing channel degrades presentation, not delivery.
    console.warn("[push] could not create notification channel", error);
  }
}

async function getExpoPushToken(): Promise<string | null> {
  // Simulators/emulators have no APNs/FCM registration to hand back.
  if (!Device.isDevice) return null;

  await ensureAndroidChannel();

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== "granted") return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    console.warn("[push] no EAS projectId in app config; cannot request a push token");
    return null;
  }

  try {
    return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch (error) {
    // Usual cause on an Android build: no FCM V1 credentials on the Expo
    // project, or google-services.json missing from the build.
    console.warn("[push] getExpoPushTokenAsync failed", error);
    return null;
  }
}

/**
 * Registers this device's Expo push token with the backend while a user is
 * signed in (unregistering on logout is done in useAuth.logout), and opens
 * the app's home when a notification is tapped. Mount once, inside
 * AuthProvider (see app/_layout.tsx).
 */
export function usePushRegistration() {
  const { currentUser, locked, isReady } = useAuth();
  const registeredRef = useRef<string | null>(null);
  const handledResponseRef = useRef<string | null>(null);
  const userId = currentUser?.id ?? null;
  const canRegister = Boolean(userId) && !locked;

  useEffect(() => {
    if (!isReady) return;
    if (!canRegister) {
      registeredRef.current = null;
      return;
    }

    let cancelled = false;
    async function sync() {
      const token = await getExpoPushToken();
      if (cancelled || !token) return;
      // Re-register when the token is new, or when the server may have lost
      // it (another user signed in on this device since).
      if (token === registeredRef.current && token === (await lastRegisteredPushToken())) return;
      try {
        await registerDevicePushToken(token, Device.osName?.toLowerCase() ?? "unknown");
        registeredRef.current = token;
      } catch (error) {
        // Best-effort: retried on the next foreground or sign-in.
        console.warn("[push] token registration failed", error);
      }
    }

    void sync();
    // Covers permission being granted from system Settings while backgrounded.
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") void sync();
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [isReady, canRegister, userId]);

  useEffect(() => {
    // The index route redirects by role/lock state, so a tap always lands
    // somewhere valid for whoever is signed in.
    const open = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const id = response.notification.request.identifier;
      if (handledResponseRef.current === id) return;
      handledResponseRef.current = id;
      router.push("/");
    };

    // Cold start: the app was launched by tapping a notification.
    void Notifications.getLastNotificationResponseAsync().then(open);
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, []);
}
