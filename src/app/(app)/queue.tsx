import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { Camera, MapPin, RefreshCw, Trash2, Wifi, WifiOff } from "lucide-react-native";

import { AppMoreMenu } from "@/components/AppMoreMenu";
import { ConfirmSheet } from "@/components/ConfirmSheet";
import { useTabBarClearance } from "@/hooks/useTabBarClearance";
import { useToast } from "@/components/Toast";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { canManageTeam } from "@/lib/rbac";
import { useVerificationQueue, type MobileVerificationRecord } from "@/lib/verificationStore";
import { useTheme } from "@/theme/ThemeProvider";

export default function QueueScreen() {
  const { colors } = useTheme();
  const { currentUser } = useAuth();
  const isOnline = useNetworkStatus();
  const toast = useToast();
  const { records, pendingCount, syncedCount, syncAll, syncOne, clearSynced, deleteRecord } = useVerificationQueue();
  const [syncing, setSyncing] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MobileVerificationRecord | null>(null);
  const autoSyncRef = useRef(0);
  const tabBarClearance = useTabBarClearance();
  const showMoreMenu = canManageTeam(currentUser);

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
    if (failed > 0) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.error(`${synced} synced, ${failed} failed. Retry when back online.`);
    } else {
      toast.success(`${synced} record${synced === 1 ? "" : "s"} synced.`);
    }
  };

  const handleRetry = async (record: MobileVerificationRecord) => {
    if (!isOnline) {
      toast.error("You're offline. Connect to retry this record.");
      return;
    }
    setRetryingId(record.id);
    const result = await syncOne(record.id);
    setRetryingId(null);
    if (result.ok) {
      toast.success(`${record.assetUid} synced.`);
    } else {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.error(result.message ?? "Retry failed.");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteRecord(deleteTarget.id);
    toast.info(`Removed ${deleteTarget.assetUid} from this device.`);
    setDeleteTarget(null);
  };

  useEffect(() => {
    if (!isOnline || pendingCount === 0 || syncing) return;
    const now = Date.now();
    if (now - autoSyncRef.current < 15000) return;
    autoSyncRef.current = now;
    void handleSync();
    // handleSync intentionally stays local to keep toast copy and state handling
    // in one place; the guards above prevent repeated reconnect loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, pendingCount]);

  const handleClearSynced = async () => {
    setConfirmClearOpen(false);
    await clearSynced();
    toast.info("Synced records cleared.");
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title="Sync"
        description="Verification records saved on this device."
        right={
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Badge label={isOnline ? "Online" : "Offline"} tint={isOnline ? "emerald" : "amber"} />
            {showMoreMenu ? <AppMoreMenu /> : null}
          </View>
        }
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
          onPress={() => setConfirmClearOpen(true)}
          disabled={syncedCount === 0}
          accessibilityLabel="Clear synced records"
          accessibilityHint="Removes records that already synced successfully from this device."
        />
      </View>
      <View style={styles.statusWrap}>
        <SyncStatus isOnline={isOnline} pendingCount={pendingCount} syncedCount={syncedCount} syncing={syncing} />
      </View>

      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: tabBarClearance }]}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <EmptyState
            icon={<WifiOff size={28} color={colors.mutedForeground} />}
            title="Nothing captured yet"
            message="Scan and verify an asset to see it queued here."
          />
        }
        renderItem={({ item }) => (
          <QueueRow
            record={item}
            retrying={retryingId === item.id}
            onRetry={() => void handleRetry(item)}
            onDelete={() => setDeleteTarget(item)}
          />
        )}
      />
      <ConfirmSheet
        visible={confirmClearOpen}
        title="Clear synced records?"
        message="This only removes records that have already synced successfully. Pending and failed records will stay on this device."
        confirmLabel="Clear"
        destructive
        onConfirm={handleClearSynced}
        onCancel={() => setConfirmClearOpen(false)}
      />
      <ConfirmSheet
        visible={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.assetUid} record?`}
        message="This removes the unsynced verification from this device permanently. The asset will not be updated on the server."
        confirmLabel="Delete"
        destructive
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </View>
  );
}

function SyncStatus({
  isOnline,
  pendingCount,
  syncedCount,
  syncing,
}: {
  isOnline: boolean;
  pendingCount: number;
  syncedCount: number;
  syncing: boolean;
}) {
  const { colors } = useTheme();
  const message = syncing
    ? `Syncing ${pendingCount} pending record${pendingCount === 1 ? "" : "s"}...`
    : isOnline
      ? pendingCount > 0
        ? `${pendingCount} record${pendingCount === 1 ? "" : "s"} ready to sync.`
        : `${syncedCount} synced record${syncedCount === 1 ? "" : "s"} on this device.`
      : `${pendingCount} pending record${pendingCount === 1 ? "" : "s"} saved safely offline.`;

  return (
    <Card style={[styles.statusCard, { backgroundColor: isOnline ? colors.card : colors.warning + "14" }]}>
      {isOnline ? <Wifi size={16} color={colors.success} /> : <WifiOff size={16} color={colors.warning} />}
      <Text style={{ color: colors.foreground, fontSize: 13, flex: 1 }}>{message}</Text>
    </Card>
  );
}

function QueueRow({
  record,
  retrying,
  onRetry,
  onDelete,
}: {
  record: MobileVerificationRecord;
  retrying: boolean;
  onRetry: () => void;
  onDelete: () => void;
}) {
  const { colors } = useTheme();
  const failed = Boolean(record.syncError);

  return (
    <Card>
      <View style={styles.rowTop}>
        <Text style={[styles.uid, { color: colors.foreground }]}>{record.assetUid}</Text>
        <Badge label={record.synced ? "Synced" : failed ? "Failed" : "Offline"} tint={record.synced ? "emerald" : failed ? "rose" : "amber"} />
      </View>
      <Text style={{ color: colors.mutedForeground, fontSize: 13 }} numberOfLines={1}>
        {record.assetName}
      </Text>
      <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 4 }}>
        {record.result} · {record.condition} · {new Date(record.capturedAt).toLocaleString()}
      </Text>
      <View style={styles.evidenceRow}>
        <View style={styles.evidenceItem}>
          <MapPin size={12} color={colors.mutedForeground} />
          <Text style={{ color: colors.mutedForeground, fontSize: 12 }} numberOfLines={1}>
            {record.gps === "Not captured" ? "No GPS" : record.gps}
          </Text>
        </View>
        <View style={styles.evidenceItem}>
          <Camera size={12} color={colors.mutedForeground} />
          <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{record.photoUri ? "Photo attached" : "No photo"}</Text>
        </View>
      </View>
      {failed ? (
        <Text style={{ color: colors.destructive, fontSize: 12, marginTop: 4 }}>
          Couldn't sync — {record.syncError}
        </Text>
      ) : null}
      {!record.synced ? (
        <View style={styles.rowActions}>
          <Button
            label={retrying ? "Retrying…" : "Retry"}
            variant="outline"
            size="sm"
            loading={retrying}
            onPress={onRetry}
            icon={<RefreshCw size={14} color={colors.foreground} />}
            style={{ flex: 1 }}
          />
          <Button
            label="Delete"
            variant="outline"
            size="sm"
            onPress={onDelete}
            icon={<Trash2 size={14} color={colors.destructive} />}
            accessibilityLabel={`Delete unsynced record for ${record.assetUid}`}
            style={{ flex: 1 }}
          />
        </View>
      ) : null}
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
  statusWrap: { paddingHorizontal: 20, paddingTop: 10 },
  statusCard: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 },
  list: { padding: 20, flexGrow: 1 },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  uid: { fontSize: 13, fontWeight: "700", fontFamily: "monospace" },
  evidenceRow: { flexDirection: "row", gap: 12, marginTop: 8, flexWrap: "wrap" },
  evidenceItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  rowActions: { flexDirection: "row", gap: 8, marginTop: 10 },
});
