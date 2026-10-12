import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LogIn, ShieldAlert, ShieldCheck, Users, X } from "lucide-react-native";

import { ConfirmSheet } from "@/components/ConfirmSheet";
import { useTabBarClearance } from "@/hooks/useTabBarClearance";
import { SubScreenHeader } from "@/components/SubScreenHeader";
import { useToast } from "@/components/Toast";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { TextField } from "@/components/ui/TextField";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api";
import { superAdminApi, type TenantDetail } from "@/lib/adminApi";
import { useTheme } from "@/theme/ThemeProvider";

// The summary screen tapping a Tenants row opens — pulls from the backend's
// dedicated GET /admin/tenants/{id} (b/lota/src/app/api/v1/admin.py's
// get_tenant_detail), which the mobile app previously never called even
// though the tenants list screen only ever showed the same handful of
// counts already visible in the row card itself.
export default function TenantDetailScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const { tenantId } = useLocalSearchParams<{ tenantId: string }>();
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [suspending, setSuspending] = useState(false);
  const [confirmSuspendOpen, setConfirmSuspendOpen] = useState(false);
  const [enterModalOpen, setEnterModalOpen] = useState(false);
  const tabBarClearance = useTabBarClearance();

  const load = useCallback(async () => {
    if (!tenantId) return;
    setError(null);
    try {
      const detail = await superAdminApi.getTenant(tenantId);
      setTenant(detail);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load this tenant.");
    }
  }, [tenantId]);

  useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleSuspendToggle = async () => {
    if (!tenant) return;
    setSuspending(true);
    try {
      const isSuspended = tenant.status === "suspended";
      const updated = isSuspended ? await superAdminApi.reactivateTenant(tenant.id) : await superAdminApi.suspendTenant(tenant.id);
      setTenant((current) => (current ? { ...current, status: updated.status, healthState: updated.healthState } : current));
      toast.success(isSuspended ? "Tenant reactivated." : "Tenant suspended.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update tenant.");
    } finally {
      setSuspending(false);
      setConfirmSuspendOpen(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SubScreenHeader title={tenant?.name ?? "Tenant"} onBack={() => router.push("/(admin)/tenants")} />

      {loading ? (
        <LoadingState label="Loading tenant…" />
      ) : error || !tenant ? (
        <ErrorState message={error ?? "Tenant not found."} onRetry={() => void load()} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: tabBarClearance }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        >
          <Card style={{ gap: 10 }}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
                  {tenant.name}
                </Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>{tenant.slug}</Text>
              </View>
              <Badge
                label={tenant.healthState}
                tint={tenant.healthState === "healthy" ? "emerald" : tenant.healthState === "attention" ? "amber" : "rose"}
              />
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button
                label={tenant.status === "suspended" ? "Reactivate" : "Suspend"}
                variant={tenant.status === "suspended" ? "default" : "outline"}
                onPress={() => setConfirmSuspendOpen(true)}
                style={{ flex: 1 }}
              />
              <Button
                label="Enter"
                variant="outline"
                icon={<LogIn size={16} color={colors.foreground} />}
                onPress={() => setEnterModalOpen(true)}
                disabled={tenant.status === "suspended"}
                style={{ flex: 1 }}
              />
            </View>
          </Card>

          <View style={styles.grid}>
            <StatTile label="Users" value={tenant.userCount} />
            <StatTile label="Active users" value={tenant.activeUserCount} />
            <StatTile label="Admins" value={tenant.adminCount} />
            <StatTile label="Assets" value={tenant.assetCount} />
          </View>

          <View style={{ gap: 10 }}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Auth posture</Text>
            <Card style={styles.authRow}>
              <AuthStat icon={<Users size={16} color={colors.mutedForeground} />} label="Active sessions" value={tenant.authSummary.activeSessionCount} />
              <AuthStat icon={<ShieldAlert size={16} color={colors.warning} />} label="Locked users" value={tenant.authSummary.lockedUserCount} />
              <AuthStat
                icon={<ShieldCheck size={16} color={colors.destructive} />}
                label="Excessive failed logins"
                value={tenant.authSummary.usersWithExcessiveFailedLogins}
              />
            </Card>
          </View>

          <View style={{ gap: 10 }}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Administrators</Text>
            {tenant.administrators.length === 0 ? (
              <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>No active administrator for this tenant.</Text>
            ) : (
              tenant.administrators.map((admin) => (
                <Card key={admin.id} style={styles.rowCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "700" }} numberOfLines={1}>
                      {admin.displayName}
                    </Text>
                    <Text style={{ color: colors.mutedForeground, fontSize: 12 }} numberOfLines={1}>
                      {admin.email} · {admin.role}
                    </Text>
                  </View>
                  <Badge label={admin.status} tint={admin.status === "Active" ? "emerald" : "zinc"} />
                </Card>
              ))
            )}
          </View>

          <View style={{ gap: 10 }}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Recent activity</Text>
            {tenant.recentActivity.length === 0 ? (
              <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>No recent activity.</Text>
            ) : (
              tenant.recentActivity.map((row) => (
                <Card key={row.id} style={{ gap: 2 }}>
                  <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "600" }}>{row.action}</Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{new Date(row.occurredAt).toLocaleString()}</Text>
                </Card>
              ))
            )}
          </View>

          <Text style={{ color: colors.mutedForeground, fontSize: 12, textAlign: "center" }}>
            {tenant.lastActivity ? `Last activity ${new Date(tenant.lastActivity).toLocaleString()}` : "No recorded activity yet."}
          </Text>
        </ScrollView>
      )}

      <ConfirmSheet
        visible={confirmSuspendOpen}
        title={tenant?.status === "suspended" ? `Reactivate ${tenant?.name}?` : `Suspend ${tenant?.name}?`}
        message={
          tenant?.status === "suspended"
            ? "Users at this tenant will regain access immediately."
            : "Users at this tenant will lose access immediately. This is logged in the platform audit trail."
        }
        confirmLabel={tenant?.status === "suspended" ? "Reactivate" : "Suspend"}
        destructive={tenant?.status !== "suspended"}
        loading={suspending}
        onConfirm={() => void handleSuspendToggle()}
        onCancel={() => setConfirmSuspendOpen(false)}
      />

      <EnterTenantModal tenantId={tenant?.id ?? null} tenantName={tenant?.name} visible={enterModalOpen} onClose={() => setEnterModalOpen(false)} />
    </View>
  );
}

// Mirrors tenants.tsx's EnterTenantModal — kept local here rather than
// shared since the two screens work from different tenant shapes
// (TenantRecord vs TenantDetail) and only the id/name are actually needed.
function EnterTenantModal({
  tenantId,
  tenantName,
  visible,
  onClose,
}: {
  tenantId: string | null;
  tenantName?: string;
  visible: boolean;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { enterTenant } = useAuth();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleEnter = async () => {
    if (!tenantId) return;
    if (!reason.trim()) {
      toast.error("Enter a reason for this session.");
      return;
    }
    setSubmitting(true);
    const result = await enterTenant(tenantId, reason.trim());
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    setReason("");
    onClose();
    router.replace("/(app)/verification");
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border, paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Enter {tenantName}</Text>
            <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
              <X size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>
          <Text style={{ color: colors.mutedForeground, fontSize: 13, marginBottom: 4 }}>
            This is logged and visible in the tenant's audit trail. State why you're entering this tenant.
          </Text>
          <View style={{ gap: 14 }}>
            <TextField
              label="Reason"
              value={reason}
              onChangeText={setReason}
              placeholder="Investigating support ticket #..."
              multiline
              numberOfLines={3}
            />
            <Button label={submitting ? "Entering…" : "Enter tenant"} onPress={() => void handleEnter()} loading={submitting} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  const { colors } = useTheme();
  return (
    <Card style={styles.tile}>
      <Text style={[styles.tileLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.tileValue, { color: colors.foreground }]}>{value}</Text>
    </Card>
  );
}

function AuthStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.authStat}>
      {icon}
      <Text style={{ color: colors.mutedForeground, fontSize: 12, flex: 1 }}>{label}</Text>
      <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "700" }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, gap: 20 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  name: { fontSize: 18, fontWeight: "800" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: { width: "47%", gap: 4, paddingVertical: 14 },
  tileLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.2 },
  tileValue: { fontSize: 20, fontWeight: "800" },
  sectionTitle: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
  authRow: { gap: 12 },
  authStat: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowCard: { flexDirection: "row", alignItems: "center", gap: 12 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, padding: 20, gap: 16 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sheetTitle: { fontSize: 17, fontWeight: "800" },
});
