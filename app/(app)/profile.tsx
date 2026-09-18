import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { LogOut } from "lucide-react-native";

import { BrandLogo } from "@/components/BrandLogo";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { apiBaseUrl } from "@/lib/api";
import { useTheme } from "@/theme/ThemeProvider";

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { currentUser, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Profile" description="Session and sync details." />

      <View style={styles.body}>
        <Card style={styles.identityCard}>
          <View style={[styles.logoCircle, { backgroundColor: "#FFFFFF", borderColor: colors.border }]}>
            <BrandLogo size={44} />
          </View>
          <Text style={[styles.name, { color: colors.foreground }]}>{currentUser?.displayName ?? currentUser?.username}</Text>
          <Text style={[styles.role, { color: colors.mutedForeground }]}>{currentUser?.role}</Text>
        </Card>

        <Card style={{ gap: 10 }}>
          <InfoRow label="Username" value={currentUser?.username ?? "—"} colors={colors} />
          <InfoRow label="Email" value={currentUser?.email ?? "—"} colors={colors} />
          <InfoRow label="Tenant" value={currentUser?.tenantName ?? "—"} colors={colors} />
          <InfoRow label="API" value={apiBaseUrl()} colors={colors} />
        </Card>

        <Button label="Sign Out" variant="destructive" icon={<LogOut size={18} color={colors.destructiveForeground} />} onPress={handleLogout} />
      </View>
    </View>
  );
}

function InfoRow({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof useTheme>["colors"] }) {
  return (
    <View style={styles.infoRow}>
      <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "600", flexShrink: 1, textAlign: "right" }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, gap: 16 },
  identityCard: { alignItems: "center", gap: 6, paddingVertical: 24 },
  logoCircle: { width: 72, height: 72, borderRadius: 36, borderWidth: 1, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  name: { fontSize: 17, fontWeight: "800" },
  role: { fontSize: 13 },
  infoRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
});
