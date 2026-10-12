import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { AlertTriangle, ChevronRight, Info, XCircle } from "lucide-react-native";

import { AdminMoreMenu } from "@/components/AdminMoreMenu";
import { useTabBarClearance } from "@/hooks/useTabBarClearance";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useToast } from "@/components/Toast";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ApiError } from "@/lib/api";
import { superAdminApi, type AttentionItem, type PlatformOverview } from "@/lib/adminApi";
import { useTheme } from "@/theme/ThemeProvider";

// Overview is meant to answer "is everything okay?" at a glance, not to be
// a second copy of Tenants or Audit — it previously rendered the full
// tenant-health list (already on the Tenants tab) and an uncapped activity
// feed (already on Audit, which paginates) end to end, so the screen just
// grew forever as more tenants/events piled up. Both lists are capped here
// with a "View all" link to the screen that actually owns that data.
const ATTENTION_PREVIEW_COUNT = 3;
const ACTIVITY_PREVIEW_COUNT = 5;

export default function AdminOverviewScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const [data, setData] = useState<PlatformOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const tabBarClearance = useTabBarClearance();

  const load = useCallback(async () => {
    try {
      const overview = await superAdminApi.overview();
      setData(overview);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not load platform overview.");
    }
  }, [toast]);

  useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const statusTint = data?.platformStatus === "operational" ? "emerald" : data?.platformStatus === "degraded" ? "amber" : "rose";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title="Platform Overview"
        description="Cross-tenant health at a glance."
        right={
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {data?.platformStatus ? <Badge label={data.platformStatus} tint={statusTint} /> : null}
            <AdminMoreMenu />
          </View>
        }
      />
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: tabBarClearance }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        {loading ? (
          <LoadingState label="Loading platform overview…" />
        ) : data ? (
          <>
            {/* Tenant counts live in the Tenant Health stat row below instead
                of here, so the same numbers aren't shown twice in two
                different framings on one screen. */}
            <View style={styles.grid}>
              <SummaryTile label="Users" value={data.summary.totalUsers} />
              <SummaryTile label="Active users" value={data.summary.activeUsers} />
              <SummaryTile label="Assets" value={data.summary.totalAssets} />
            </View>

            {data.attention.length > 0 && (
              <View style={{ gap: 10 }}>
                <SectionHeader
                  title="Needs attention"
                  count={data.attention.length}
                  onViewAll={data.attention.length > ATTENTION_PREVIEW_COUNT ? () => router.push("/(admin)/tenants") : undefined}
                />
                {data.attention.slice(0, ATTENTION_PREVIEW_COUNT).map((item) => (
                  <AttentionRow key={item.id} item={item} />
                ))}
                {data.attention.length > ATTENTION_PREVIEW_COUNT ? (
                  <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                    +{data.attention.length - ATTENTION_PREVIEW_COUNT} more — see Tenants for the full list.
                  </Text>
                ) : null}
              </View>
            )}

            <TenantHealthSummary rows={data.tenantHealth} />

            <View style={{ gap: 10 }}>
              <SectionHeader
                title="Recent activity"
                onViewAll={data.recentActivity.length > 0 ? () => router.push("/(admin)/audit") : undefined}
              />
              {data.recentActivity.length === 0 ? (
                <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>No recent activity.</Text>
              ) : (
                data.recentActivity.slice(0, ACTIVITY_PREVIEW_COUNT).map((row) => (
                  <Card key={row.id} style={{ gap: 2 }}>
                    <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "600" }}>{row.action}</Text>
                    <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                      {row.tenantName} · {new Date(row.occurredAt).toLocaleString()}
                    </Text>
                  </Card>
                ))
              )}
            </View>
          </>
        ) : (
          <ErrorState message="Could not load platform overview." onRetry={() => void load()} />
        )}
      </ScrollView>
    </View>
  );
}

function SectionHeader({ title, count, onViewAll }: { title: string; count?: number; onViewAll?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
        {title}
        {typeof count === "number" ? ` (${count})` : ""}
      </Text>
      {onViewAll ? (
        <Pressable onPress={onViewAll} style={styles.viewAllButton} hitSlop={8} accessibilityRole="button" accessibilityLabel={`View all ${title.toLowerCase()}`}>
          <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "700" }}>View all</Text>
          <ChevronRight size={14} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

// Replaces the old full tenant-health list (every tenant, one row each —
// already exactly what the Tenants tab shows) with just the counts that
// matter on a glance screen: how many need a look. Tapping through goes to
// the real list rather than duplicating it here.
function TenantHealthSummary({ rows }: { rows: PlatformOverview["tenantHealth"] }) {
  const { colors } = useTheme();
  const suspended = rows.filter((row) => row.healthState === "suspended").length;
  const attention = rows.filter((row) => row.healthState === "attention").length;
  const healthy = rows.length - suspended - attention;

  return (
    <View style={{ gap: 10 }}>
      <SectionHeader title="Tenant health" onViewAll={() => router.push("/(admin)/tenants")} />
      <Card style={styles.healthSummaryRow}>
        <HealthStat label="Healthy" value={healthy} tint="emerald" />
        <HealthStat label="Attention" value={attention} tint="amber" />
        <HealthStat label="Suspended" value={suspended} tint="rose" />
      </Card>
    </View>
  );
}

function HealthStat({ label, value, tint }: { label: string; value: number; tint: "emerald" | "amber" | "rose" }) {
  const { colors } = useTheme();
  const dotColor = tint === "emerald" ? colors.success : tint === "amber" ? colors.warning : colors.destructive;
  return (
    <View style={styles.healthStat}>
      <View style={styles.healthStatTop}>
        <View style={[styles.healthDot, { backgroundColor: dotColor }]} />
        <Text style={{ color: colors.mutedForeground, fontSize: 11, fontWeight: "600", textTransform: "uppercase" }}>{label}</Text>
      </View>
      <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "800" }}>{value}</Text>
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

function AttentionRow({ item }: { item: AttentionItem }) {
  const { colors } = useTheme();
  const Icon = item.severity === "critical" ? XCircle : item.severity === "warning" ? AlertTriangle : Info;
  const tintColor = item.severity === "critical" ? colors.destructive : item.severity === "warning" ? "#B45309" : colors.mutedForeground;
  return (
    <Card style={styles.rowCard}>
      <Icon size={18} color={tintColor} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "600" }}>{item.summary}</Text>
        {item.tenantName ? <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{item.tenantName}</Text> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, gap: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: { width: "31%", gap: 4, paddingVertical: 14 },
  tileLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.2 },
  tileValue: { fontSize: 20, fontWeight: "800" },
  sectionTitle: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  viewAllButton: { flexDirection: "row", alignItems: "center", gap: 2 },
  rowCard: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowTitle: { fontSize: 14, fontWeight: "700" },
  healthSummaryRow: { flexDirection: "row", justifyContent: "space-between" },
  healthStat: { gap: 4, alignItems: "flex-start" },
  healthStatTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  healthDot: { width: 8, height: 8, borderRadius: 4 },
});
