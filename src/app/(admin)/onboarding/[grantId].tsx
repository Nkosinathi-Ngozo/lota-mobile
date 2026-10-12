import { useCallback, useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { CheckCircle2, XCircle } from "lucide-react-native";

import { useTabBarClearance } from "@/hooks/useTabBarClearance";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useToast } from "@/components/Toast";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";
import { onboardingGrantsApi, type OnboardingGrantRecord, type OnboardingGrantStatus } from "@/lib/adminApi";
import { ApiError } from "@/lib/api";
import { useTheme } from "@/theme/ThemeProvider";

const STATUS_TINT: Record<OnboardingGrantStatus, "emerald" | "amber" | "rose" | "zinc"> = {
  pending: "amber",
  scanned: "amber",
  approved: "emerald",
  collected: "emerald",
  rejected: "rose",
  expired: "zinc",
};

export default function OnboardingGrantDetailScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const { grantId } = useLocalSearchParams<{ grantId: string }>();
  const [grant, setGrant] = useState<OnboardingGrantRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reopening, setReopening] = useState(false);
  const tabBarClearance = useTabBarClearance();

  const load = useCallback(async () => {
    if (!grantId) return;
    try {
      const record = await onboardingGrantsApi.get(grantId);
      setGrant(record);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not load this grant.");
    } finally {
      setLoading(false);
    }
  }, [grantId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleApprove = async () => {
    if (!grant) return;
    setSubmitting(true);
    try {
      const updated = await onboardingGrantsApi.approve(grant.id);
      setGrant(updated);
      toast.success("Approved. The admin can now finish setting up their account.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not approve this grant.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!grant) return;
    if (!rejectReason.trim()) {
      toast.error("Enter a reason for rejecting.");
      return;
    }
    setSubmitting(true);
    try {
      const updated = await onboardingGrantsApi.reject(grant.id, rejectReason.trim());
      setGrant(updated);
      setShowReject(false);
      toast.success("Grant rejected.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not reject this grant.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReopen = async () => {
    if (!grant) return;
    setReopening(true);
    try {
      const updated = await onboardingGrantsApi.reopen(grant.id);
      setGrant(updated);
      toast.success("New QR code ready — go back to the Onboard tab to show it.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not reopen this grant.");
    } finally {
      setReopening(false);
    }
  };

  if (loading || !grant) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  const canDecide = grant.status === "scanned";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={grant.tenantName} description={grant.inviteeEmail} />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: tabBarClearance }]}>
        <Card style={{ gap: 12 }}>
          <View style={styles.rowBetween}>
            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Status</Text>
            <Badge label={grant.status} tint={STATUS_TINT[grant.status]} />
          </View>

          {grant.matchPhrase ? (
            <View style={{ gap: 4 }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Match phrase</Text>
              <Text style={[styles.matchPhrase, { color: colors.foreground }]}>{grant.matchPhrase}</Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 17 }}>
                Read this out to the admin (or compare on their screen) before approving. If it doesn't match exactly what they see, reject
                this grant — it means someone else may have scanned a forwarded copy of the code.
              </Text>
            </View>
          ) : null}

          <View style={styles.rowBetween}>
            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Scan attempts</Text>
            <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "600" }}>{grant.scanCount}</Text>
          </View>
          {grant.scannedAt ? (
            <View style={styles.rowBetween}>
              <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Scanned</Text>
              <Text style={{ color: colors.foreground, fontSize: 13 }}>{new Date(grant.scannedAt).toLocaleString()}</Text>
            </View>
          ) : null}
          {grant.scannedIp ? (
            <View style={styles.rowBetween}>
              <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Device IP</Text>
              <Text style={{ color: colors.foreground, fontSize: 13 }}>{grant.scannedIp}</Text>
            </View>
          ) : null}
          {grant.scannedUserAgent ? (
            <View style={{ gap: 4 }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Device</Text>
              <Text style={{ color: colors.foreground, fontSize: 12 }} numberOfLines={3}>
                {grant.scannedUserAgent}
              </Text>
            </View>
          ) : null}
          {grant.rejectedReason ? (
            <View style={{ gap: 4 }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Rejection reason</Text>
              <Text style={{ color: colors.foreground, fontSize: 13 }}>{grant.rejectedReason}</Text>
            </View>
          ) : null}
        </Card>

        {canDecide && !showReject ? (
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button
              label="Reject"
              variant="destructive"
              icon={<XCircle size={16} color="#fff" />}
              onPress={() => setShowReject(true)}
              style={{ flex: 1 }}
            />
            <Button
              label={submitting ? "Approving…" : "Approve"}
              icon={<CheckCircle2 size={16} color={colors.primaryForeground} />}
              onPress={handleApprove}
              loading={submitting}
              style={{ flex: 1 }}
            />
          </View>
        ) : null}

        {canDecide && showReject ? (
          <Card style={{ gap: 12 }}>
            <TextField
              label="Reason"
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Match phrase didn't line up…"
              multiline
              numberOfLines={3}
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button label="Cancel" variant="outline" onPress={() => setShowReject(false)} style={{ flex: 1 }} />
              <Button
                label={submitting ? "Rejecting…" : "Confirm reject"}
                variant="destructive"
                onPress={handleReject}
                loading={submitting}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        ) : null}

        {grant.status === "approved" ? (
          <Text style={{ color: colors.mutedForeground, fontSize: 13, textAlign: "center" }}>
            Approved. The admin's device will sign them in automatically the next time it checks.
          </Text>
        ) : null}

        {grant.status === "rejected" ? (
          <Button label={reopening ? "Reopening…" : "Reopen for a new scan"} loading={reopening} onPress={handleReopen} />
        ) : null}

        <Button label="Back" variant="outline" onPress={() => router.back()} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, gap: 16 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  matchPhrase: { fontSize: 20, fontWeight: "800", letterSpacing: 0.5 },
});
