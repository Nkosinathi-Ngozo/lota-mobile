import { useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyRound, ScanFace } from "lucide-react-native";

import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/Button";
import { getBiometricAvailability, promptBiometricUnlock } from "@/lib/biometrics";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/theme/ThemeProvider";

// Shown instead of the normal app screens on cold start when a stored
// session exists and biometric unlock is enabled (see useAuth's `locked`
// and app/index.tsx). Never the only way in: "Use password instead" always
// falls back to the real login form, and a failed/cancelled prompt leaves
// the user here to retry or fall back, never stuck.
export default function UnlockScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { currentUser, unlock } = useAuth();
  const [status, setStatus] = useState("");
  const [checking, setChecking] = useState(true);
  const attemptedRef = useRef(false);

  const attempt = async () => {
    setChecking(true);
    setStatus("");
    const availability = await getBiometricAvailability();
    if (!availability.available) {
      // Biometrics were enrolled when the setting was turned on but are no
      // longer available (removed enrollment, hardware issue) — fail open
      // to the password form rather than stranding the user on a dead
      // unlock screen.
      unlock();
      router.replace("/(auth)/login");
      return;
    }
    const result = await promptBiometricUnlock();
    setChecking(false);
    if (result.ok) {
      unlock();
      router.replace("/");
      return;
    }
    if (result.message) setStatus(result.message);
  };

  useEffect(() => {
    if (attemptedRef.current) return;
    attemptedRef.current = true;
    void attempt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.center}>
        <View style={[styles.logoCard, { backgroundColor: "#FFFFFF", borderColor: colors.border }]}>
          <BrandLogo size={64} />
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>Welcome back{currentUser ? `, ${currentUser.displayName}` : ""}</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 14, textAlign: "center", paddingHorizontal: 24 }}>
          {checking ? "Waiting for Face ID / fingerprint…" : status || "Unlock to continue."}
        </Text>
      </View>

      <View style={{ gap: 12 }}>
        <Button
          label="Try again"
          icon={<ScanFace size={18} color={colors.primaryForeground} />}
          onPress={attempt}
          loading={checking}
          size="lg"
        />
        <Button
          label="Use password instead"
          variant="outline"
          icon={<KeyRound size={18} color={colors.foreground} />}
          onPress={() => {
            unlock();
            router.replace("/(auth)/login");
          }}
          size="lg"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "space-between", paddingHorizontal: 24 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  logoCard: {
    width: 96,
    height: 96,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1976D2",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  title: { fontSize: 22, fontWeight: "800", textAlign: "center" },
});
