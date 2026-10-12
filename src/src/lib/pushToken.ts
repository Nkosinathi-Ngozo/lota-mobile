import { pushApi } from "@/lib/api";
import { getJson, remove, setJson } from "@/lib/storage";

// Kept outside React so signing out (useAuth.logout) can unregister this
// device while the session is still valid, without importing the hook.
const REGISTERED_TOKEN_KEY = "lota.push.registered-token.v1";

export async function registerDevicePushToken(token: string, platform: string): Promise<void> {
  await pushApi.register(token, platform);
  await setJson(REGISTERED_TOKEN_KEY, token);
}

export async function lastRegisteredPushToken(): Promise<string | null> {
  return getJson<string>(REGISTERED_TOKEN_KEY);
}

// Best-effort and never throws: signing out must not fail because the
// network is down. The server also prunes tokens Expo reports as dead.
export async function unregisterDevicePushToken(): Promise<void> {
  const token = await lastRegisteredPushToken();
  if (!token) return;
  try {
    await pushApi.unregister(token);
  } catch {
    // keep going: the local record is still cleared below
  }
  await remove(REGISTERED_TOKEN_KEY);
}
