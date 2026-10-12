import { useEffect, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ShieldCheck, XCircle } from "lucide-react-native";

import { Button } from "@/components/ui/Button";
import { onboardingApi } from "@/lib/api";
import { useTheme } from "@/theme/ThemeProvider";

// Polls for the operator's approval while showing the match phrase for the
// human-to-human comparison — this is the step that defeats a forwarded
// screenshot: someone else's device scanning the same QR image gets a
// DIFFERENT match phrase (a fresh one is minted per scan), so if what's on
// screen here doesn't match what the operator sees, this isn't a legitimate
// device and the operator should reject it rather than approve.
export default function OnboardWaitingScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { claimToken, matchPhrase, pollIntervalSeconds } = useLocalSearchParams<{
    claimToken: string;
    matchPhrase: string;
    pollIntervalSeconds: string;
  }>();
  const [state, setState] = useState<"waiting" | "approved" | "rejected" | "expired">("waiting");
  const stoppedRef = useRef(false);

  useEffect(() => {
    if (!claimToken) return;
    const intervalMs = Math.max(2, Number(pollIntervalSeconds) || 3) * 1000;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      if (stoppedRef.current) return;
      try {
        const result = await onboardingApi.status(claimToken);
        if (result.status === "approved") {
          setState("approved");
          return;
        }
        if (result.status === "rejected") {
          setState("rejected");
          return;
        }
        if (result.status === "expired") {
          setState("expired");
          return;
        }
      } catch {
        // A transient network error just means the next poll tries again —
        // no need to surface it as a terminal state.
      }
      timer = setTimeout(poll, intervalMs);
    };

    void poll();
    return () => {
      stoppedRef.current = true;
      clearTimeout(timer);
    };
  }, [claimToken, pollIntervalSeconds]);

  useEffect(() => {
    if (state === "approved" && claimToken) {
      router.replace({ pathname: "/(onboard)/finish", params: { claimToken } });
    }
  }, [state, claimToken]);

  if (state === "rejected" || state === "expired") {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <XCircle size={56} color={colors.destructive} />
        <Text style={[styles.title, { color: colors.foreground }]}>
          {state === "rejected" ? "Not approved" : "This code expired"}
        </Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 14, textAlign: "center", paddingHorizontal: 24 }}>
          {state === "rejected"
            ? "Your operator did not approve this device. Ask them for a new QR code if this wasn't expected."
            : "Ask your operator to show you a new QR code."}
        </Text>
        <Button label="Scan again" onPress={() => router.replace("/(onboard)/scan")} size="lg" />
      </View>
    );
  }

  return (
    <View style={[styles.center, { backgroundColor: colors.background, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <ShieldCheck size={48} color={colors.primary} />
      <Text style={[styles.title, { color: colors.foreground }]}>Confirm with your operator</Text>
      <Text style={{ color: colors.mutedForeground, fontSize: 14, textAlign: "center", paddingHorizontal: 24 }}>
        Read this phrase to them (or show them this screen). Only continue if it matches exactly what they see on their device.
      </Text>
      <View style={[styles.phraseBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Text style={[styles.phrase, { color: colors.foreground }]}>{matchPhrase}</Text>
      </View>
      <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>Waiting for them to approve…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 24 },
  title: { fontSize: 22, fontWeight: "800", textAlign: "center" },
  phraseBox: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 18, alignSelf: "stretch" },
  phrase: { fontSize: 22, fontWeight: "800", textAlign: "center", letterSpacing: 0.5 },
});
