import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

// Dedicated to auth session data ONLY (access/refresh tokens, current user).
// expo-secure-store backs onto the iOS Keychain / Android Keystore instead
// of AsyncStorage's plain, unencrypted on-disk storage — a compromised
// device, an older-Android app with shared storage access, or a filesystem/
// backup extraction could otherwise read tokens directly out of AsyncStorage.
//
// Deliberately NOT used for bulk data (e.g. the offline verification queue
// in verificationStore.tsx, which stores photo URIs and can grow large):
// SecureStore enforces a ~2KB per-value size limit on Android, which an
// auth session JSON blob comfortably fits under but a growing offline queue
// would not. Bulk/non-sensitive data stays on AsyncStorage via storage.ts.
//
// expo-secure-store has no web implementation (there's no Keychain/Keystore
// equivalent in a browser) and throws if called there. This app also builds
// for web (see app.json's "web" config), so we fall back to AsyncStorage on
// that platform only — the same ceiling the web app (f/lota) already
// accepts for its own token storage, not a regression for that platform.
const isWeb = Platform.OS === "web";

export async function getSecureJson<T>(key: string): Promise<T | null> {
  try {
    const raw = isWeb ? await AsyncStorage.getItem(key) : await SecureStore.getItemAsync(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setSecureJson<T>(key: string, value: T): Promise<void> {
  try {
    const raw = JSON.stringify(value);
    if (isWeb) await AsyncStorage.setItem(key, raw);
    else await SecureStore.setItemAsync(key, raw);
  } catch {
    // best-effort persistence — the session still lives in memory for the
    // current app run even if it can't be written to the keystore
  }
}

export async function removeSecure(key: string): Promise<void> {
  try {
    if (isWeb) await AsyncStorage.removeItem(key);
    else await SecureStore.deleteItemAsync(key);
  } catch {
    // ignore
  }
}
