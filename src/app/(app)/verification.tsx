import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from "react-native";
import { CloudOff, Database, MapPin, Navigation, SearchX } from "lucide-react-native";

import { AppMoreMenu } from "@/components/AppMoreMenu";
import { AssetTypeBadge, VerificationBadge } from "@/components/AssetBadges";
import { useToast } from "@/components/Toast";
import { useTabBarClearance } from "@/hooks/useTabBarClearance";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useAuth } from "@/hooks/useAuth";
import { useDueAssets } from "@/hooks/useAssets";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { canManageTeam } from "@/lib/rbac";
import {
  assetFallbackLocation,
  canNavigateToLocation,
  getLocations,
  getLocationPath,
  getNearestLocation,
  locationDisplayAddress,
  openNavigationToLocation,
} from "@/lib/location-utils";
import { useVerificationQueue } from "@/lib/verificationStore";
import { useTheme } from "@/theme/ThemeProvider";
import type { AssetRecord } from "@/types/domain";
import { Badge } from "@/components/ui/Badge";

export default function VerificationScreen() {
  const { colors } = useTheme();
  const { currentUser } = useAuth();
  const { assets, dueAssets, loading, error, reload } = useDueAssets();
  const { pendingCount, hasPendingRecord } = useVerificationQueue();
  const isOnline = useNetworkStatus();
  const [query, setQuery] = useState("");
  // The floating tab bar renders position:absolute on top of every tab
  // screen (see FloatingTabBar.tsx) instead of taking part in layout, so
  // this list needs its own bottom clearance or the last row ends up
  // hidden behind the bar.
  const tabBarClearance = useTabBarClearance();
  // Profile only loses its bottom-tab slot for Admin/International Admin
  // (see (app)/_layout.tsx's showProfileTab) — everyone else already has it
  // on the bar directly, so this button would be a redundant duplicate.
  const showMoreMenu = canManageTeam(currentUser);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return dueAssets;
    return dueAssets.filter((asset) =>
      [asset.uid, asset.name, asset.region, asset.building, asset.room, asset.custodian].filter(Boolean).join(" ").toLowerCase().includes(needle),
    );
  }, [dueAssets, query]);

  // Grouped by the asset's actual verificationStatus — there is no due-date
  // field on AssetRecord to bucket into Overdue/Due Today/Upcoming, so this
  // sorts by real severity (Overdue surfaces first) instead of a schedule
  // the backend doesn't track.
  const sections = useMemo(() => {
    const overdue = rows.filter((asset) => asset.verificationStatus === "Overdue");
    const due = rows.filter((asset) => asset.verificationStatus === "Due");
    return [
      ...(overdue.length ? [{ title: "Overdue", data: overdue }] : []),
      ...(due.length ? [{ title: "Due", data: due }] : []),
    ];
  }, [rows]);

  const isSearching = query.trim().length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title={`Hi, ${currentUser?.displayName?.split(" ")[0] ?? "verifier"}`}
        description="Assets assigned for on-site verification."
        right={
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Badge label={isOnline ? "Online" : "Offline"} tint={isOnline ? "emerald" : "amber"} />
            {showMoreMenu ? <AppMoreMenu /> : null}
          </View>
        }
      />

      <View style={styles.summaryRow}>
        <SummaryTile label="Due" value={dueAssets.length} colors={colors} />
        <SummaryTile label="Pending Sync" value={pendingCount} colors={colors} />
      </View>

      <View style={styles.searchWrap}>
        <TextField placeholder="Search UID, name, room, custodian…" value={query} onChangeText={setQuery} autoCapitalize="none" accessibilityLabel="Search due assets" />
      </View>

      {loading ? (
        <LoadingState label="Loading due assets…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.uid}
          contentContainerStyle={[styles.list, { paddingBottom: tabBarClearance }]}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.primary} />}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionHeaderText, { color: colors.mutedForeground }]}>{section.title.toUpperCase()}</Text>
              <Badge label={String(section.data.length)} tint={section.title === "Overdue" ? "rose" : "amber"} />
            </View>
          )}
          renderItem={({ item }) => <AssetRow asset={item} allAssets={assets} pendingLocally={hasPendingRecord(item.uid)} />}
          ListEmptyComponent={
            <View style={styles.center}>
              {isSearching ? (
                <EmptyState icon={<SearchX size={28} color={colors.mutedForeground} />} title="No matches" message={`No assets match "${query.trim()}".`} />
              ) : !isOnline && dueAssets.length === 0 ? (
                <EmptyState
                  icon={<CloudOff size={28} color={colors.mutedForeground} />}
                  title="Offline"
                  message="You're offline and no cached assets are due. Connect to refresh your list."
                />
              ) : (
                <EmptyState icon={<Database size={28} color={colors.mutedForeground} />} title="All caught up" message="No assets currently require verification." />
              )}
            </View>
          }
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

function AssetRow({ asset, allAssets, pendingLocally }: { asset: AssetRecord; allAssets: AssetRecord[]; pendingLocally: boolean }) {
  const { colors } = useTheme();
  const toast = useToast();
  const selectedLocation = getNearestLocation(asset, allAssets);
  const locations = getLocations(allAssets);
  const locationLabel = selectedLocation ? getLocationPath(locations, selectedLocation.uid) || selectedLocation.name : assetFallbackLocation(asset);
  const address = locationDisplayAddress(selectedLocation);
  const canNavigate = canNavigateToLocation(selectedLocation);

  const handleNavigate = async () => {
    if (!selectedLocation) return;
    try {
      await openNavigationToLocation(selectedLocation, locationLabel || asset.name);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open navigation for this location.");
    }
  };

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
              {locationLabel}
            </Text>
          </View>
        </View>
        {address ? (
          <Text style={[styles.addressText, { color: colors.mutedForeground }]} numberOfLines={2}>
            {address}
          </Text>
        ) : null}
        {canNavigate ? (
          <View style={styles.navigateRow}>
            <Button
              label="Navigate"
              variant="outline"
              size="sm"
              icon={<Navigation size={14} color={colors.foreground} />}
              onPress={() => void handleNavigate()}
              style={{ flex: 1 }}
            />
          </View>
        ) : null}
        {pendingLocally ? (
          <View style={styles.pendingRow}>
            <Badge label="Verification pending sync" tint="sky" />
          </View>
        ) : null}
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
  addressText: { fontSize: 12, marginTop: 6, lineHeight: 16 },
  navigateRow: { flexDirection: "row", marginTop: 10 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingBottom: 10, paddingTop: 4 },
  sectionHeaderText: { fontSize: 12, fontWeight: "800", letterSpacing: 0.6 },
  pendingRow: { marginTop: 8 },
});
