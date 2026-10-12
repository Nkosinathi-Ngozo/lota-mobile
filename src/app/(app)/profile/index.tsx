import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Bell, LogOut, Palette, RefreshCw, ShieldCheck, UserCircle } from "lucide-react-native";

import { BrandLogo } from "@/components/BrandLogo";
import { ConfirmSheet } from "@/components/ConfirmSheet";
import { useTabBarClearance } from "@/hooks/useTabBarClearance";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SettingsRow } from "@/components/profile/SettingsRow";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { useVerificationQueue } from "@/lib/verificationStore";
import { useTheme } from "@/theme/ThemeProvider";

// Profile used to be one long scroll of cards (edit profile, account,
// security, notifications, appearance, data & sync, about, diagnostics)
// all at the same visual level. Each settings group now lives on its own
// pushed screen under app/(app)/profile/*, so this top-level screen only
// needs identity, the settings list, and Sign Out — kept at the bottom,
// below the settings list, matching the standard iOS/Android Settings
// pattern rather than sitting above it.
export default function ProfileScreen() {
  const { colors } = useTheme();
  const { currentUser, logout } = useAuth();
  const { pendingCount } = useVerificationQueue();
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const tabBarClearance = useTabBarClearance();

  const performLogout = async () => {
    setLoggingOut(true);
    await logout();
    setLoggingOut(false);
    setConfirmLogoutOpen(false);
    router.replace("/(auth)/login");
  };

  const handleLogoutPress = () => {
    if (pendingCount > 0) {
      setConfirmLogoutOpen(true);
      return;
    }
    void performLogout();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Profile" description="Your account, settings, and sync details." />

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: tabBarClearance }]}>
        <Card style={styles.identityCard}>
          <View style={[styles.logoCircle, { backgroundColor: "#FFFFFF", borderColor: colors.border }]}>
            <BrandLogo size={44} />
          </View>
          <Text style={[styles.name, { color: colors.foreground }]}>{currentUser?.displayName ?? currentUser?.username}</Text>
          <Text style={[styles.role, { color: colors.mutedForeground }]}>{currentUser?.role}</Text>
        </Card>

        <Card style={styles.listCard}>
          <SettingsRow
            icon={<UserCircle size={16} color={colors.foreground} />}
            label="Account"
            onPress={() => router.push("/(app)/profile/account")}
          />
          <SettingsRow
            icon={<ShieldCheck size={16} color={colors.foreground} />}
            label="Security"
            onPress={() => router.push("/(app)/profile/security")}
          />
          <SettingsRow
            icon={<RefreshCw size={16} color={colors.foreground} />}
            label="Data & Sync"
            value={pendingCount > 0 ? `${pendingCount} pending` : undefined}
            onPress={() => router.push("/(app)/profile/data-sync")}
          />
          <SettingsRow
            icon={<Bell size={16} color={colors.foreground} />}
            label="Notifications"
            onPress={() => router.push("/(app)/profile/notifications")}
          />
          <SettingsRow
            icon={<Palette size={16} color={colors.foreground} />}
            label="Appearance"
            onPress={() => router.push("/(app)/profile/appearance")}
            last
          />
        </Card>

        <Card style={styles.listCard}>
          <SettingsRow
            icon={<ShieldCheck size={16} color={colors.foreground} />}
            label="Support & Diagnostics"
            onPress={() => router.push("/(app)/profile/support")}
            last
          />
        </Card>

        <Button label="Sign Out" variant="destructive" icon={<LogOut size={18} color={colors.destructiveForeground} />} onPress={handleLogoutPress} />
      </ScrollView>

      <ConfirmSheet
        visible={confirmLogoutOpen}
        title="Sign out with unsynced records?"
        message={`You have ${pendingCount} verification record${pendingCount === 1 ? "" : "s"} saved on this device that ${pendingCount === 1 ? "hasn't" : "haven't"} synced yet. They'll stay on this device, but won't reach the server until you sign back in and sync.`}
        confirmLabel="Sign out anyway"
        destructive
        loading={loggingOut}
        onConfirm={() => void performLogout()}
        onCancel={() => setConfirmLogoutOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, gap: 16 },
  identityCard: { alignItems: "center", gap: 6, paddingVertical: 24 },
  logoCircle: { width: 72, height: 72, borderRadius: 36, borderWidth: 1, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  name: { fontSize: 17, fontWeight: "800" },
  role: { fontSize: 13 },
  listCard: { padding: 4, gap: 0 },
});
