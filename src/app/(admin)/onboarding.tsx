import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import { FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Plus, QrCode as QrCodeIcon, X } from "lucide-react-native";

import { AdminMoreMenu } from "@/components/AdminMoreMenu";
import { useTabBarClearance } from "@/hooks/useTabBarClearance";
import { QrCode } from "@/components/QrCode";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useToast } from "@/components/Toast";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";
import { onboardingGrantsApi, type OnboardingGrantRecord, type OnboardingGrantStatus } from "@/lib/adminApi";
import { ApiError } from "@/lib/api";
import { useTheme } from "@/theme/ThemeProvider";

function canReopen(grant: OnboardingGrantRecord) {
  // Mirrors the backend's reopen_grant: pending/expired (never scanned, or
  // the reveal window lapsed) plus rejected (operator scanned it, didn't
  // approve, wants to give the same organization one more single scan).
  return (
    grant.status === "expired" ||
    grant.status === "rejected" ||
    (grant.status === "pending" && new Date(grant.expiresAt).getTime() <= Date.now())
  );
}

const STATUS_TINT: Record<OnboardingGrantStatus, "emerald" | "amber" | "rose" | "zinc"> = {
  pending: "amber",
  scanned: "amber",
  approved: "emerald",
  collected: "emerald",
  rejected: "rose",
  expired: "zinc",
};

export default function AdminOnboardingScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const [grants, setGrants] = useState<OnboardingGrantRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [revealGrant, setRevealGrant] = useState<OnboardingGrantRecord | null>(null);
  const [reopeningId, setReopeningId] = useState<string | null>(null);
  const tabBarClearance = useTabBarClearance();

  const handleReopen = useCallback(
    async (grant: OnboardingGrantRecord) => {
      setReopeningId(grant.id);
      try {
        const updated = await onboardingGrantsApi.reopen(grant.id);
        setGrants((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        toast.success("New QR code ready.");
        setRevealGrant(updated);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Could not reopen this grant.");
      } finally {
        setReopeningId(null);
      }
    },
    [toast],
  );

  // No LIST endpoint exists server-side yet (grants are looked up by id) —
  // this screen tracks grants created in this session locally, and each
  // Card polls its own detail so status changes (scanned/approved) show up
  // without a manual refresh.
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const updated = await Promise.all(grants.map((g) => onboardingGrantsApi.get(g.id).catch(() => g)));
      setGrants(updated);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title="Onboard via QR"
        description="Provision a new tenant admin without email."
        right={
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Pressable
              onPress={() => setCreateOpen(true)}
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Onboard a new tenant via QR"
            >
              <Plus size={18} color={colors.primaryForeground} />
            </Pressable>
            <AdminMoreMenu />
          </View>
        }
      />

      <FlatList
        data={grants}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: tabBarClearance }]}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <QrCodeIcon size={36} color={colors.mutedForeground} />
            <Text style={{ color: colors.mutedForeground, marginTop: 12, textAlign: "center" }}>
              No onboarding grants yet. Tap + to create one and reveal a QR code for a new tenant's admin to scan.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Card style={{ gap: 10 }}>
            <View style={styles.rowTop}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
                  {item.tenantName}
                </Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{item.inviteeEmail}</Text>
              </View>
              <Badge label={item.status} tint={STATUS_TINT[item.status]} />
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {item.status === "pending" && !canReopen(item) && item.qrPayload ? (
                <Button label="Show QR" variant="outline" size="sm" onPress={() => setRevealGrant(item)} style={{ flex: 1 }} />
              ) : null}
              {canReopen(item) ? (
                <Button
                  label={reopeningId === item.id ? "Reopening…" : "Reopen QR"}
                  size="sm"
                  loading={reopeningId === item.id}
                  onPress={() => handleReopen(item)}
                  style={{ flex: 1 }}
                />
              ) : null}
              {(item.status === "scanned" || item.status === "approved" || item.status === "rejected") && (
                <Button
                  label="Review"
                  size="sm"
                  onPress={() => router.push({ pathname: "/(admin)/onboarding/[grantId]", params: { grantId: item.id } })}
                  style={{ flex: 1 }}
                />
              )}
            </View>
          </Card>
        )}
      />

      <CreateGrantModal
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(grant) => {
          setGrants((current) => [grant, ...current]);
          setCreateOpen(false);
          setRevealGrant(grant);
        }}
      />

      <RevealQrModal grant={revealGrant} onClose={() => setRevealGrant(null)} />
    </View>
  );
}

function CreateGrantModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (grant: OnboardingGrantRecord) => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [tenantName, setTenantName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminName, setAdminName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setTenantName("");
    setAdminEmail("");
    setAdminName("");
  };

  const handleCreate = async () => {
    if (!tenantName.trim() || !adminEmail.trim()) {
      toast.error("Enter a tenant name and the admin's email.");
      return;
    }
    setSubmitting(true);
    try {
      const grant = await onboardingGrantsApi.create({
        tenantName: tenantName.trim(),
        adminEmail: adminEmail.trim(),
        adminDisplayName: adminName.trim() || undefined,
      });
      toast.success(`${grant.tenantName} created — reveal the QR code now.`);
      reset();
      onCreated(grant);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not create the grant.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border, paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>New tenant via QR</Text>
            <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
              <X size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>
          <View style={{ gap: 14 }}>
            <TextField label="Tenant name" value={tenantName} onChangeText={setTenantName} placeholder="Acme Corp" />
            <TextField
              label="Admin email"
              value={adminEmail}
              onChangeText={setAdminEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="admin@acme.com"
            />
            <TextField label="Admin name (optional)" value={adminName} onChangeText={setAdminName} placeholder="Jane Doe" />
            <Button label={submitting ? "Creating…" : "Create and show QR"} onPress={handleCreate} loading={submitting} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function RevealQrModal({ grant, onClose }: { grant: OnboardingGrantRecord | null; onClose: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={Boolean(grant)} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border, alignItems: "center", paddingBottom: insets.bottom + 20 }]}>
          <View style={[styles.sheetHeader, { alignSelf: "stretch" }]}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Hand this to {grant?.tenantName}'s admin</Text>
            <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
              <X size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>
          {grant?.qrPayload ? <QrCode value={grant.qrPayload} /> : null}
          <Text style={{ color: colors.mutedForeground, fontSize: 13, textAlign: "center", marginTop: 12 }}>
            This code expires in a few minutes. Once they scan it, come back here to compare the match phrase and approve.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  addButton: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  list: { padding: 20, flexGrow: 1 },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: 48, paddingHorizontal: 32 },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  name: { fontSize: 15, fontWeight: "700" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, padding: 20, gap: 16 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sheetTitle: { fontSize: 17, fontWeight: "800", flex: 1, marginRight: 12 },
});
