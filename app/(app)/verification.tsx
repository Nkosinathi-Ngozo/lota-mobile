import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { MapPin } from "lucide-react-native";

import { AssetTypeBadge, VerificationBadge } from "@/components/AssetBadges";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";
import { useAuth } from "@/hooks/useAuth";
import { useDueAssets } from "@/hooks/useAssets";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useVerificationQueue } from "@/lib/verificationStore";
import { useTheme } from "@/theme/ThemeProvider";
import type { AssetRecord } from "@/types/domain";
import { Badge } from "@/components/ui/Badge";

export default function VerificationScreen() {
  const { colors } = useTheme();
  const { currentUser } = useAuth();
  const { dueAssets, loading, error, reload } = useDueAssets();
  const { pendingCount } = useVerificationQueue();
  const isOnline = useNetworkStatus();
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return dueAssets;
    return dueAssets.filter((asset) =>
      [asset.uid, asset.name, asset.region, asset.building, asset.room, asset.custodian].filter(Boolean).join(" ").toLowerCase().includes(needle),
    );
  }, [dueAssets, query]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title={`Hi, ${currentUser?.displayName?.split(" ")[0] ?? "verifier"}`}
        description="Assets assigned for on-site verification."
        right={<Badge label={isOnline ? "Online" : "Offline"} tint={isOnline ? "emerald" : "amber"} />}
      />

      <View style={styles.summaryRow}>
        <SummaryTile label="Due" value={dueAssets.length} colors={colors} />
        <SummaryTile label="Pending Sync" value={pendingCount} colors={colors} />
      </View>

      <View style={styles.searchWrap}>
        <TextField placeholder="Search UID, name, room, custodian…" value={query} onChangeText={setQuery} autoCapitalize="none" />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={{ color: colors.destructive, textAlign: "center", paddingHorizontal: 24 }}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.uid}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.primary} />}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ color: colors.mutedForeground }}>No assets currently require verification.</Text>
            </View>
          }
          renderItem={({ item }) => <AssetRow asset={item} />}
        />
      )}
    </View>
  );
}

function SummaryTile({ label, value, colors }: { label: string; value: number; colors: ReturnType<typeof useTheme>["colors"] }) {
  return (
    <Card style={styles.summaryTile}>
      <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: colors.foreground }]}>{value}</Text>
    </Card>
  );
}

function AssetRow({ asset }: { asset: AssetRecord }) {
  const { colors } = useTheme();
  const location = [asset.building, asset.room].filter(Boolean).join(" · ") || asset.region;

  return (
    <Pressable onPress={() => router.push({ pathname: "/(app)/asset/[uid]", params: { uid: asset.uid } })}>
      <Card>
        <View style={styles.rowTop}>
          <Text style={[styles.uid, { color: colors.mutedForeground }]}>{asset.uid}</Text>
          <VerificationBadge status={asset.verificationStatus} />
        </View>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
          {asset.name}
        </Text>
        <View style={styles.rowBottom}>
          <AssetTypeBadge type={asset.assetType} />
          <View style={styles.locationRow}>
            <MapPin size={12} color={colors.mutedForeground} />
            <Text style={[styles.locationText, { color: colors.mutedForeground }]} numberOfLines={1}>
              {location}
            </Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 48 },
  summaryRow: { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingTop: 16 },
  summaryTile: { flex: 1, alignItems: "flex-start", gap: 4 },
  summaryLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3 },
  summaryValue: { fontSize: 22, fontWeight: "800" },
  searchWrap: { paddingHorizontal: 20, paddingTop: 14 },
  list: { padding: 20, paddingTop: 14, flexGrow: 1 },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  uid: { fontSize: 11, fontFamily: "monospace" },
  name: { fontSize: 16, fontWeight: "700", marginTop: 4 },
  rowBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6, gap: 8 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 1 },
  locationText: { fontSize: 12, flexShrink: 1 },
});
