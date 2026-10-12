import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Plus, QrCode as QrCodeIcon, X } from "lucide-react-native";

import { AppMoreMenu } from "@/components/AppMoreMenu";
import { useTabBarClearance } from "@/hooks/useTabBarClearance";
import { QrCode } from "@/components/QrCode";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useToast } from "@/components/Toast";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { TextField } from "@/components/ui/TextField";
import { ApiError } from "@/lib/api";
import type { OnboardingGrantRecord, OnboardingGrantStatus } from "@/lib/adminApi";
import { orgMemberOnboardingApi, teamApi } from "@/lib/teamApi";
import { useTheme } from "@/theme/ThemeProvider";
import type { AppUser } from "@/types/domain";

// Same set the web app's Add User form offers (f/lota/src/lib/rbac.ts's
// userRoles) minus the two tenant-admin roles themselves — an Admin invites
// teammates into operational roles here; granting another Admin/
// International Admin still goes through the web console's User Management,
// same as it does today for the email-invite path.
const INVITABLE_ROLES = [
  "Asset Manager",
  "Finance User",
  "Country Manager",
  "Location Manager",
  "Maintenance Officer",
  "Verifier",
  "Custodian / User",
  "Auditor",
];

function canReopen(grant: OnboardingGrantRecord) {
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

export default function TeamScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const [members, setMembers] = useState<AppUser[]>([]);
  const [grants, setGrants] = useState<OnboardingGrantRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [revealGrant, setRevealGrant] = useState<OnboardingGrantRecord | null>(null);
  const [reopeningId, setReopeningId] = useState<string | null>(null);
  const tabBarClearance = useTabBarClearance();

  const loadMembers = useCallback(async () => {
    try {
      const list = await teamApi.list();
      setMembers(list);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not load your team.");
    }
  }, [toast]);

  useFocusEffect(
    useCallback(() => {
      void loadMembers();
    }, [loadMembers]),
  );

  const handleReopen = useCallback(
    async (grant: OnboardingGrantRecord) => {
      setReopeningId(grant.id);
      try {
        const updated = await orgMemberOnboardingApi.reopen(grant.id);
        setGrants((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        toast.success("New QR code ready.");
        setRevealGrant(updated);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Could not reopen this invite.");
      } finally {
        setReopeningId(null);
      }
    },
    [toast],
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadMembers();
      const updated = await Promise.all(grants.map((g) => orgMemberOnboardingApi.get(g.id).catch(() => g)));
      setGrants(updated);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title="Team"
        description={`${members.length} member${members.length === 1 ? "" : "s"}`}
        right={
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Pressable
              onPress={() => setCreateOpen(true)}
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Invite a teammate"
            >
              <Plus size={18} color={colors.primaryForeground} />
            </Pressable>
            <AppMoreMenu />
          </View>
        }
      />

      <FlatList
        data={grants}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: tabBarClearance }]}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          members.length ? (
            <View style={{ gap: 10, marginBottom: 16 }}>
              {members.map((member) => (
                <Card key={member.id} style={{ gap: 4 }}>
                  <View style={styles.rowTop}>
                    <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
                      {member.displayName}
                    </Text>
                    <Badge label={member.status} tint={member.status === "Active" ? "emerald" : member.status === "Suspended" ? "rose" : "amber"} />
                  </View>
                  <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                    {member.role} · {member.email}
                  </Text>
                </Card>
              ))}
            </View>
          ) : null
        }
        ListEmptyComponent={
          grants.length === 0 ? (
            <View style={styles.center}>
              <QrCodeIcon size={36} color={colors.mutedForeground} />
              <Text style={{ color: colors.mutedForeground, marginTop: 12, textAlign: "center" }}>
                No pending invites. Tap + to invite a teammate via QR code.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Card style={{ gap: 10 }}>
            <View style={styles.rowTop}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
                  {item.inviteeEmail}
                </Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{item.inviteeRole}</Text>
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
                  onPress={() => router.push({ pathname: "/(app)/team/[grantId]", params: { grantId: item.id } })}
                  style={{ flex: 1 }}
                />
              )}
            </View>
          </Card>
        )}
      />

      <InviteModal
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

function InviteModal({
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
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState(INVITABLE_ROLES[INVITABLE_ROLES.length - 1]);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setEmail("");
    setDisplayName("");
    setRole(INVITABLE_ROLES[INVITABLE_ROLES.length - 1]);
  };

  const handleCreate = async () => {
    if (!email.trim()) {
      toast.error("Enter the teammate's email.");
      return;
    }
    setSubmitting(true);
    try {
      const grant = await orgMemberOnboardingApi.create({
        email: email.trim(),
        displayName: displayName.trim() || undefined,
        role,
      });
      toast.success("Invite created — reveal the QR code now.");
      reset();
      onCreated(grant);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not create the invite.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border, paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Invite a teammate</Text>
            <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
              <X size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>
          <View style={{ gap: 14 }}>
            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="teammate@company.com"
            />
            <TextField label="Name (optional)" value={displayName} onChangeText={setDisplayName} placeholder="Jane Doe" />
            <Select label="Role" value={role} onChange={setRole} options={INVITABLE_ROLES.map((value) => ({ value, label: value }))} />
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
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Hand this to {grant?.inviteeEmail}</Text>
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
