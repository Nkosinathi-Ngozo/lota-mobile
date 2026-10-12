import { useState } from "react";
import { router } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LogOut, ShieldAlert } from "lucide-react-native";

import { useToast } from "@/components/Toast";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/theme/ThemeProvider";

// Shown on every screen for the duration of an impersonation session so
// it's never ambiguous which account is actually acting — a super admin
// silently viewing/acting as a tenant user is exactly the kind of thing
// that needs to stay visible at all times, not just discoverable in Profile.
export function ImpersonationBanner() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { isImpersonating, impersonatedTenantName, returnToSuperAdmin } = useAuth();
  const [returning, setReturning] = useState(false);

  if (!isImpersonating) return null;

  const handleReturn = async () => {
    setReturning(true);
    const result = await returnToSuperAdmin();
    setReturning(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    router.replace("/(admin)/overview");
  };

  return (
    <View style={[styles.wrap, { paddingTop: insets.top, backgroundColor: "#B45309" }]}>
      <View style={styles.row} accessibilityRole="alert">
        <ShieldAlert size={16} color="#FFFFFF" />
        <Text style={styles.text} numberOfLines={1}>
          Viewing as {impersonatedTenantName ?? "tenant"}
        </Text>
        <Pressable
          onPress={handleReturn}
          disabled={returning}
          style={styles.button}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Return to Super Admin"
        >
          {returning ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <LogOut size={14} color="#FFFFFF" />
              <Text style={styles.buttonText}>Exit</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  text: { flex: 1, color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  button: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.2)" },
  buttonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
});
