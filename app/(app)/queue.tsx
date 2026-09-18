import { useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { RefreshCw, Trash2, Wifi, WifiOff } from "lucide-react-native";

import { useToast } from "@/components/Toast";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useVerificationQueue, type MobileVerificationRecord } from "@/lib/verificationStore";
import { useTheme } from "@/theme/ThemeProvider";

export default function QueueScreen() {
  const { colors } = useTheme();
  const isOnline = useNetworkStatus();
  const toast = useToast();
  const { records, pendingCount, syncedCount, syncAll, clearSynced } = useVerificationQueue();
  const [syncing, setSyncing] = useState(false);

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
      <ScreenHeader
        title="Offline Queue"
        description="Verification records captured on this device."
        right={<Badge label={isOnline ? "Online" : "Offline"} tint={isOnline ? "emerald" : "amber"} />}
      />

      <View style={styles.summaryRow}>
        <Card style={styles.summaryTile}>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Pending</Text>
          <Text style={[styles.summaryValue, { color: colors.foreground }]}>{pendingCount}</Text>
        </Card>
        <Card style={styles.summaryTile}>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Synced</Text>
          <Text style={[styles.summaryValue, { color: colors.foreground }]}>{syncedCount}</Text>
        </Card>
      </View>

      <View style={styles.actionsRow}>
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
          onPress={() => void clearSynced()}
        />
      </View>

      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={{ color: colors.mutedForeground }}>No verification records captured yet.</Text>
          </View>
        }
        renderItem={({ item }) => <QueueRow record={item} />}
      />
    </View>
  );
}

function QueueRow({ record }: { record: MobileVerificationRecord }) {
  const { colors } = useTheme();
  return (
    <Card>
      <View style={styles.rowTop}>
        <Text style={[styles.uid, { color: colors.foreground }]}>{record.assetUid}</Text>
        <Badge
          label={record.synced ? "Synced" : record.syncError ? "Failed" : "Offline"}
          tint={record.synced ? "emerald" : record.syncError ? "rose" : "amber"}
        />
      </View>
      <Text style={{ color: colors.mutedForeground, fontSize: 13 }} numberOfLines={1}>
        {record.assetName}
      </Text>
      <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 4 }}>
        {record.result} · {record.condition} · {record.gps}
      </Text>
      {record.syncError ? <Text style={{ color: colors.destructive, fontSize: 12, marginTop: 4 }}>{record.syncError}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center", paddingVertical: 48 },
  summaryRow: { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingTop: 16 },
  summaryTile: { flex: 1, alignItems: "flex-start", gap: 4 },
  summaryLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3 },
  summaryValue: { fontSize: 22, fontWeight: "800" },
  actionsRow: { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingTop: 14 },
  list: { padding: 20, flexGrow: 1 },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  uid: { fontSize: 13, fontWeight: "700", fontFamily: "monospace" },
});
