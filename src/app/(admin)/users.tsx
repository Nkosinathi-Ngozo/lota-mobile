import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Mail, ShieldCheck, Users } from "lucide-react-native";

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
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { ApiError } from "@/lib/api";
import { superAdminApi, type AdminUserRecord, type UsersOverview } from "@/lib/adminApi";
import { useTheme } from "@/theme/ThemeProvider";

export default function AdminUsersScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const [overview, setOverview] = useState<UsersOverview | null>(null);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<AdminUserRecord | null>(null);
  const [suspending, setSuspending] = useState(false);
  const tabBarClearance = useTabBarClearance();

  const debouncedQuery = useDebouncedValue(query);

  const load = useCallback(
    async (q?: string) => {
      try {
        const [overviewData, userList] = await Promise.all([
          superAdminApi.usersOverview(),
          superAdminApi.listUsers({ q: q || undefined }),
        ]);
        setOverview(overviewData);
        setUsers(userList);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Could not load users.");
      }
    },
    [toast],
  );

  useEffect(() => {
    setLoading(true);
    void load(debouncedQuery).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load(query);
    setRefreshing(false);
  };

  const updateUser = (updated: AdminUserRecord) => {
    setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  };

  const handleSuspendToggle = async (user: AdminUserRecord) => {
    setSuspending(true);
    try {
      const updated = user.status === "Suspended" ? await superAdminApi.reactivateUser(user.id) : await superAdminApi.suspendUser(user.id);
      updateUser(updated);
      toast.success(updated.status === "Suspended" ? "User suspended." : "User reactivated.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update user.");
    } finally {
      setSuspending(false);
      setSuspendTarget(null);
    }
  };

  const handleResendInvite = async (user: AdminUserRecord) => {
    try {
      const updated = await superAdminApi.resendInvite(user.id);
      updateUser(updated);
      toast.success("Invite resent.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not resend invite.");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title="Users & Access"
        description={overview ? `${overview.totalUsers} users across all tenants` : undefined}
        right={<AdminMoreMenu />}
      />

      {overview && (
        <View style={styles.summaryRow}>
          <SummaryTile label="Active" value={overview.activeUsers} />
          <SummaryTile label="Locked" value={overview.lockedUsers} />
          <SummaryTile label="Privileged" value={overview.privilegedUsers} />
          <SummaryTile label="Admins" value={overview.platformAdminCount} />
        </View>
      )}

      <View style={styles.searchWrap}>
        <TextField value={query} onChangeText={setQuery} placeholder="Search users…" autoCapitalize="none" autoCorrect={false} />
      </View>

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: tabBarClearance }]}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon={<Users size={28} color={colors.mutedForeground} />}
              title="No users found"
              message={query ? `No users match "${query}".` : undefined}
            />
          ) : null
        }
        renderItem={({ item }) => (
          <UserRow user={item} onToggleSuspend={() => setSuspendTarget(item)} onResendInvite={() => handleResendInvite(item)} />
        )}
      />

      <ConfirmSheet
        visible={Boolean(suspendTarget)}
        title={suspendTarget?.status === "Suspended" ? `Reactivate ${suspendTarget?.displayName}?` : `Suspend ${suspendTarget?.displayName}?`}
        message={
          suspendTarget?.status === "Suspended"
            ? "This user will regain access immediately."
            : "This user will lose access immediately. This is logged in the audit trail."
        }
        confirmLabel={suspendTarget?.status === "Suspended" ? "Reactivate" : "Suspend"}
        destructive={suspendTarget?.status !== "Suspended"}
        loading={suspending}
        onConfirm={() => suspendTarget && void handleSuspendToggle(suspendTarget)}
        onCancel={() => setSuspendTarget(null)}
      />
    </View>
  );
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  const { colors } = useTheme();
  return (
    <Card style={styles.tile}>
      <Text style={[styles.tileLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.tileValue, { color: colors.foreground }]}>{value}</Text>
    </Card>
  );
}

function UserRow({
  user,
  onToggleSuspend,
  onResendInvite,
}: {
  user: AdminUserRecord;
  onToggleSuspend: () => void;
  onResendInvite: () => void;
}) {
  const { colors } = useTheme();
  const isSuspended = user.status === "Suspended";
  const isPending = user.status === "Pending Activation";
  const tint = user.status === "Active" ? "emerald" : user.status === "Locked" ? "rose" : isPending ? "amber" : "zinc";

  return (
    <Card style={{ gap: 8 }}>
      <View style={styles.rowTop}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={[styles.userName, { color: colors.foreground }]} numberOfLines={1}>
              {user.displayName}
            </Text>
            {user.isPlatformAdmin ? <ShieldCheck size={14} color={colors.primary} /> : null}
          </View>
          <Text style={{ color: colors.mutedForeground, fontSize: 12 }} numberOfLines={1}>
            {user.email} · {user.tenantName}
          </Text>
        </View>
        <Badge label={user.status} tint={tint} />
      </View>
      <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{user.role}</Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Button label={isSuspended ? "Reactivate" : "Suspend"} variant={isSuspended ? "default" : "outline"} size="sm" onPress={onToggleSuspend} style={{ flex: 1 }} />
        {isPending ? (
          <Button label="Resend invite" variant="outline" size="sm" icon={<Mail size={14} color={colors.foreground} />} onPress={onResendInvite} style={{ flex: 1 }} />
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  summaryRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20, paddingTop: 14 },
  tile: { flex: 1, gap: 2, paddingVertical: 10, alignItems: "center" },
  tileLabel: { fontSize: 10, fontWeight: "600", textTransform: "uppercase" },
  tileValue: { fontSize: 17, fontWeight: "800" },
  searchWrap: { paddingHorizontal: 20, paddingTop: 14 },
  list: { padding: 20, flexGrow: 1 },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: 48 },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  userName: { fontSize: 14, fontWeight: "700" },
});
