import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import { FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Building2, LogIn, Plus, X } from "lucide-react-native";

import { AdminMoreMenu } from "@/components/AdminMoreMenu";
import { ConfirmSheet } from "@/components/ConfirmSheet";
import { useTabBarClearance } from "@/hooks/useTabBarClearance";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useToast } from "@/components/Toast";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { TextField } from "@/components/ui/TextField";
import { useAuth } from "@/hooks/useAuth";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { ApiError } from "@/lib/api";
import { superAdminApi, type TenantRecord } from "@/lib/adminApi";
import { useTheme } from "@/theme/ThemeProvider";

export default function AdminTenantsScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [enterTarget, setEnterTarget] = useState<TenantRecord | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<TenantRecord | null>(null);
  const [suspending, setSuspending] = useState(false);
  const tabBarClearance = useTabBarClearance();

  const debouncedQuery = useDebouncedValue(query);

  const load = useCallback(
    async (q?: string) => {
      try {
        const list = await superAdminApi.listTenants({ q: q || undefined });
        setTenants(list);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Could not load tenants.");
      }
    },
    [toast],
  );

  useEffect(() => {
    setLoading(true);
    void load(debouncedQuery).finally(() => setLoading(false));
    // Only the debounced query (and a fresh `load` identity from toast
    // changing) should trigger a fetch — not `query` itself, which updates
    // on every keystroke and would otherwise defeat the debounce.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load(query);
    setRefreshing(false);
  };

  const handleSuspendToggle = async (tenant: TenantRecord) => {
    setSuspending(true);
    try {
      const updated =
        tenant.status === "suspended" ? await superAdminApi.reactivateTenant(tenant.id) : await superAdminApi.suspendTenant(tenant.id);
      setTenants((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      toast.success(updated.status === "suspended" ? "Tenant suspended." : "Tenant reactivated.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update tenant.");
    } finally {
      setSuspending(false);
      setSuspendTarget(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title="Tenants"
        description={`${tenants.length} tenant${tenants.length === 1 ? "" : "s"}`}
        right={
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Pressable
              onPress={() => setCreateOpen(true)}
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Create a new tenant"
            >
              <Plus size={18} color={colors.primaryForeground} />
            </Pressable>
            <AdminMoreMenu />
          </View>
        }
      />

      <View style={styles.searchWrap}>
        <TextField value={query} onChangeText={setQuery} placeholder="Search tenants…" autoCapitalize="none" autoCorrect={false} />
      </View>

      <FlatList
        data={tenants}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: tabBarClearance }]}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon={<Building2 size={28} color={colors.mutedForeground} />}
              title="No tenants found"
              message={query ? `No tenants match "${query}".` : "Tap + to create the first tenant."}
            />
          ) : null
        }
        renderItem={({ item }) => (
          <TenantRow tenant={item} onToggleSuspend={() => setSuspendTarget(item)} onEnter={() => setEnterTarget(item)} />
        )}
      />

      <CreateTenantModal
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(tenant) => {
          setTenants((current) => [tenant, ...current]);
          setCreateOpen(false);
        }}
      />

      <EnterTenantModal tenant={enterTarget} onClose={() => setEnterTarget(null)} />

      <ConfirmSheet
        visible={Boolean(suspendTarget)}
        title={suspendTarget?.status === "suspended" ? `Reactivate ${suspendTarget?.name}?` : `Suspend ${suspendTarget?.name}?`}
        message={
          suspendTarget?.status === "suspended"
            ? "Users at this tenant will regain access immediately."
            : "Users at this tenant will lose access immediately. This is logged in the platform audit trail."
        }
        confirmLabel={suspendTarget?.status === "suspended" ? "Reactivate" : "Suspend"}
        destructive={suspendTarget?.status !== "suspended"}
        loading={suspending}
        onConfirm={() => suspendTarget && void handleSuspendToggle(suspendTarget)}
        onCancel={() => setSuspendTarget(null)}
      />
    </View>
  );
}

function TenantRow({ tenant, onToggleSuspend, onEnter }: { tenant: TenantRecord; onToggleSuspend: () => void; onEnter: () => void }) {
  const { colors } = useTheme();
  const isSuspended = tenant.status === "suspended";
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/(admin)/tenants/[tenantId]", params: { tenantId: tenant.id } })}
      accessibilityRole="button"
      accessibilityLabel={`View ${tenant.name} details`}
    >
      <Card style={{ gap: 10 }}>
        <View style={styles.rowTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.tenantName, { color: colors.foreground }]} numberOfLines={1}>
              {tenant.name}
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{tenant.slug}</Text>
          </View>
          <Badge
            label={tenant.healthState}
            tint={tenant.healthState === "healthy" ? "emerald" : tenant.healthState === "attention" ? "amber" : "rose"}
          />
        </View>
        <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
          {tenant.userCount} users · {tenant.adminCount} admins · {tenant.assetCount} assets
        </Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button
            label={isSuspended ? "Reactivate" : "Suspend"}
            variant={isSuspended ? "default" : "outline"}
            size="sm"
            onPress={onToggleSuspend}
            style={{ flex: 1 }}
          />
          <Button
            label="Enter"
            variant="outline"
            size="sm"
            icon={<LogIn size={14} color={colors.foreground} />}
            onPress={onEnter}
            disabled={isSuspended}
            style={{ flex: 1 }}
          />
        </View>
      </Card>
    </Pressable>
  );
}

function CreateTenantModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (tenant: TenantRecord) => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [name, setName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminName, setAdminName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setName("");
    setAdminEmail("");
    setAdminName("");
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Enter a tenant name.");
      return;
    }
    setSubmitting(true);
    try {
      const tenant = await superAdminApi.createTenant({
        name: name.trim(),
        initialAdminEmail: adminEmail.trim() || undefined,
        initialAdminDisplayName: adminName.trim() || undefined,
      });
      toast.success(`${tenant.name} created.`);
      reset();
      onCreated(tenant);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not create tenant.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border, paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>New tenant</Text>
            <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
              <X size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <View style={{ gap: 14 }}>
            <TextField label="Tenant name" value={name} onChangeText={setName} placeholder="Acme Corp" />
            <TextField
              label="Initial admin email (optional)"
              value={adminEmail}
              onChangeText={setAdminEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="admin@acme.com"
            />
            <TextField label="Initial admin name (optional)" value={adminName} onChangeText={setAdminName} placeholder="Jane Doe" />
            <Button label={submitting ? "Creating…" : "Create tenant"} onPress={handleCreate} loading={submitting} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function EnterTenantModal({ tenant, onClose }: { tenant: TenantRecord | null; onClose: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { enterTenant } = useAuth();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleEnter = async () => {
    if (!tenant) return;
    if (!reason.trim()) {
      toast.error("Enter a reason for this session.");
      return;
    }
    setSubmitting(true);
    const result = await enterTenant(tenant.id, reason.trim());
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
    <Modal visible={Boolean(tenant)} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border, paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Enter {tenant?.name}</Text>
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
            <Button label={submitting ? "Entering…" : "Enter tenant"} onPress={handleEnter} loading={submitting} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  addButton: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  searchWrap: { paddingHorizontal: 20, paddingTop: 14 },
  list: { padding: 20, flexGrow: 1 },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: 48 },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  tenantName: { fontSize: 15, fontWeight: "700" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, padding: 20, gap: 16 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sheetTitle: { fontSize: 17, fontWeight: "800" },
});
