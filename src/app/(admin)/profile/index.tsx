import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Bell, LogOut, Palette, ShieldCheck, UserCircle } from "lucide-react-native";

import { BrandLogo } from "@/components/BrandLogo";
import { useTabBarClearance } from "@/hooks/useTabBarClearance";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SettingsRow } from "@/components/profile/SettingsRow";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/theme/ThemeProvider";

// Mirrors app/(app)/profile/index.tsx's restructure: a short top-level
// screen with each settings group pushed to its own screen and Sign Out at
// the bottom (below the settings list, matching the standard iOS/Android
// Settings pattern) — no Data & Sync row here since a platform admin's own
// tenant has no field verification workload (see this group's
// support.tsx/DiagnosticsSection, which still applies platform-wide).
export default function AdminProfileScreen() {
  const { colors } = useTheme();
  const { currentUser, logout } = useAuth();
  const tabBarClearance = useTabBarClearance();

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Profile" description="Your Super Admin account and settings." />

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: tabBarClearance }]}>
        <Card style={styles.identityCard}>
          <View style={[styles.logoCircle, { backgroundColor: "#FFFFFF", borderColor: colors.border }]}>
            <BrandLogo size={44} />
          </View>
          <Text style={[styles.name, { color: colors.foreground }]}>{currentUser?.displayName ?? currentUser?.username}</Text>
          <Badge label="Platform Super Admin" tint="violet" />
        </Card>

        <Card style={styles.listCard}>
          <SettingsRow
            icon={<UserCircle size={16} color={colors.foreground} />}
            label="Account"
            onPress={() => router.push("/(admin)/profile/account")}
          />
          <SettingsRow
            icon={<ShieldCheck size={16} color={colors.foreground} />}
            label="Security"
            onPress={() => router.push("/(admin)/profile/security")}
          />
          <SettingsRow
            icon={<Bell size={16} color={colors.foreground} />}
            label="Notifications"
            onPress={() => router.push("/(admin)/profile/notifications")}
          />
          <SettingsRow
            icon={<Palette size={16} color={colors.foreground} />}
            label="Appearance"
            onPress={() => router.push("/(admin)/profile/appearance")}
            last
          />
        </Card>

        <Card style={styles.listCard}>
          <SettingsRow
            icon={<ShieldCheck size={16} color={colors.foreground} />}
            label="Support & Diagnostics"
            onPress={() => router.push("/(admin)/profile/support")}
            last
          />
        </Card>

        <Button label="Sign Out" variant="destructive" icon={<LogOut size={18} color={colors.destructiveForeground} />} onPress={handleLogout} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, gap: 16 },
  identityCard: { alignItems: "center", gap: 8, paddingVertical: 24 },
  logoCircle: { width: 72, height: 72, borderRadius: 36, borderWidth: 1, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  name: { fontSize: 17, fontWeight: "800" },
  listCard: { padding: 4, gap: 0 },
});
