import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ChevronRight, RefreshCw, Trash2, Wifi, WifiOff } from "lucide-react-native";

import { useTabBarClearance } from "@/hooks/useTabBarClearance";
import { SubScreenHeader } from "@/components/SubScreenHeader";
import { useToast } from "@/components/Toast";
import { InfoRow, SectionTitle } from "@/components/profile/ProfileSections";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useVerificationQueue } from "@/lib/verificationStore";
import { useTheme } from "@/theme/ThemeProvider";

export default function DataSyncSettingsScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const isOnline = useNetworkStatus();
  const { pendingCount, syncedCount, syncAll, clearSynced } = useVerificationQueue();
  const [syncing, setSyncing] = useState(false);
  const tabBarClearance = useTabBarClearance();

  const handleSync = async () => {
    if (!isOnline) {
      toast.error("You're offline. Connect to sync verification records.");
      return;
    }
    setSyncing(true);
    const { synced, failed } = await syncAll(true);
    setSyncing(false);
    if (synced === 0 && failed === 0) {
      toast.info("No offline records to sync.");
      return;
    }
    if (failed > 0) toast.error(`${synced} synced, ${failed} failed. Retry when back online.`);
    else toast.success(`${synced} record${synced === 1 ? "" : "s"} synced.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Explicit target: see account.tsx's comment on why not router.back(). */}
      <SubScreenHeader title="Data & Sync" onBack={() => router.push("/(app)/profile")} />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: tabBarClearance }]}>
        <Card style={{ gap: 12 }}>
          <View style={styles.rowBetween}>
            <SectionTitle>Data &amp; sync</SectionTitle>
            <Badge label={isOnline ? "Online" : "Offline"} tint={isOnline ? "emerald" : "amber"} />
          </View>
          <InfoRow label="Pending records" value={String(pendingCount)} />
          <InfoRow label="Synced records" value={String(syncedCount)} />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button
              label={syncing ? "Syncing…" : "Sync Now"}
              onPress={handleSync}
              loading={syncing}
              disabled={pendingCount === 0}
              icon={isOnline ? <Wifi size={16} color={colors.primaryForeground} /> : <WifiOff size={16} color={colors.primaryForeground} />}
              style={{ flex: 1 }}
            />
            <Button
              variant="outline"
              size="icon"
              icon={<Trash2 size={18} color={colors.foreground} />}
              onPress={() => void clearSynced().then(() => toast.info("Synced records cleared."))}
              disabled={syncedCount === 0}
              accessibilityLabel="Clear synced records"
            />
          </View>
          <Pressable onPress={() => router.push("/(app)/queue")} style={styles.linkRow} hitSlop={8} accessibilityRole="button">
            <RefreshCw size={14} color={colors.mutedForeground} />
            <Text style={{ color: colors.mutedForeground, fontSize: 13, flex: 1 }}>View offline queue</Text>
            <ChevronRight size={16} color={colors.mutedForeground} />
          </Pressable>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, gap: 16 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 4 },
});
