// Biometric unlock for an already-stored session — NOT a separate credential
// or a server-side second factor. A password sign-in still creates the real
// session (access + refresh token, see api.ts's loginApi); this only gates
// *resuming* that already-stored session on next app open with Face ID/
// Touch ID/fingerprint instead of retyping the password. Disabling
// biometrics, losing enrollment, or a failed prompt always falls back to
// the normal password form — this is never the only way in.
import * as LocalAuthentication from "expo-local-authentication";

import { getSecureJson, removeSecure, setSecureJson } from "@/lib/secureStorage";

const ENABLED_KEY = "lota.auth.biometric-enabled.v1";

export type BiometricAvailability = {
  // Device has fingerprint/face hardware AND at least one biometric is
  // actually enrolled (Settings > Face ID / Fingerprint) — both must be
  // true for authenticateAsync to ever succeed, so the app never offers to
  // enable biometrics on hardware that can't currently use them.
  available: boolean;
  kind: "face" | "fingerprint" | "biometric" | null;
};

export async function getBiometricAvailability(): Promise<BiometricAvailability> {
  try {
    const [hasHardware, isEnrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    if (!hasHardware || !isEnrolled) return { available: false, kind: null };
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return { available: true, kind: "face" };
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return { available: true, kind: "fingerprint" };
    }
    return { available: true, kind: "biometric" };
  } catch {
    // expo-local-authentication has no web implementation for
    // authenticateAsync and this app also builds for web (app.json) — treat
    // any failure to even ask as "not available" rather than throwing.
    return { available: false, kind: null };
  }
}

export async function isBiometricUnlockEnabled(): Promise<boolean> {
  return Boolean(await getSecureJson<boolean>(ENABLED_KEY));
}

export async function setBiometricUnlockEnabled(enabled: boolean): Promise<void> {
  if (enabled) await setSecureJson(ENABLED_KEY, true);
  else await removeSecure(ENABLED_KEY);
}

export async function promptBiometricUnlock(): Promise<{ ok: boolean; message?: string }> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Unlock LOTA",
      cancelLabel: "Use password instead",
      // Losing biometric auth should not silently fall through to the
      // device's PIN/pattern/passcode as an equivalent unlock — that's a
      // materially weaker check than what the user opted into, and the
      // password form (always one tap away via cancelLabel) is the
      // deliberate fallback instead.
      disableDeviceFallback: true,
    });
    if (result.success) return { ok: true };
    if (result.error === "user_cancel" || result.error === "system_cancel") {
      return { ok: false };
    }
    return { ok: false, message: "Could not verify. Use your password instead." };
  } catch {
    // authenticateAsync has no web implementation (throws there) — every
    // call site is expected to gate on getBiometricAvailability() first, but
    // this is defense in depth against a caller that doesn't.
    return { ok: false, message: "Biometric unlock isn't available on this device." };
  }
}
