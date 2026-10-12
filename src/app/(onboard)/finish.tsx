import { useEffect, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActivityIndicator } from "react-native";
import { XCircle } from "lucide-react-native";

import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { ApiError, onboardingApi } from "@/lib/api";
import { useTheme } from "@/theme/ThemeProvider";

// Single-use credential collection: exchanges the approved claim token for
// a real, active session (auto-login) — the operator's approval plus the
// match-phrase confirmation already constitute verification, so there's no
// further email/link step here. Adopts the session, then hands off to the
// root router (app/index.tsx), which sees mustChangePassword=true and
// routes straight into (onboard)/change-password before anywhere else.
export default function OnboardFinishScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { claimToken } = useLocalSearchParams<{ claimToken: string }>();
  const { adoptOnboardedSession } = useAuth();
  const [error, setError] = useState("");
  const collectedRef = useRef(false);

  useEffect(() => {
    if (!claimToken || collectedRef.current) return;
    collectedRef.current = true;
    onboardingApi
      .collect(claimToken)
      .then(async (result) => {
        await adoptOnboardedSession(result);
        router.replace("/");
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "This link has already been used or has expired.");
      });
  }, [claimToken, adoptOnboardedSession]);

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <XCircle size={56} color={colors.destructive} />
        <Text style={[styles.title, { color: colors.foreground, textAlign: "center" }]}>Could not finish setup</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 14, textAlign: "center", paddingHorizontal: 24 }}>{error}</Text>
        <Button label="Back to sign in" onPress={() => router.replace("/(auth)/login")} size="lg" />
      </View>
    );
  }

  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={{ color: colors.mutedForeground, fontSize: 13, marginTop: 12 }}>Finishing setup…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 24 },
  title: { fontSize: 22, fontWeight: "800" },
});
