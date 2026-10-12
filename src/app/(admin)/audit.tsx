import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";

import { ScrollText } from "lucide-react-native";

import { useTabBarClearance } from "@/hooks/useTabBarClearance";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { TextField } from "@/components/ui/TextField";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { ApiError } from "@/lib/api";
import { superAdminApi, type AdminAuditRow } from "@/lib/adminApi";
import { useTheme } from "@/theme/ThemeProvider";

const PAGE_SIZE = 30;

export default function AdminAuditScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const [items, setItems] = useState<AdminAuditRow[]>([]);
  const [query, setQuery] = useState("");
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const tabBarClearance = useTabBarClearance();

  const debouncedQuery = useDebouncedValue(query);

  const load = useCallback(
    async (q?: string) => {
      try {
        const response = await superAdminApi.listAudit({ q: q || undefined, limit: PAGE_SIZE, offset: 0 });
        setItems(response.items);
        setTotal(response.total);
        setHasMore(response.hasMore);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Could not load the audit log.");
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

  const handleLoadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const response = await superAdminApi.listAudit({ q: query || undefined, limit: PAGE_SIZE, offset: items.length });
      setItems((current) => [...current, ...response.items]);
      setTotal(response.total);
      setHasMore(response.hasMore);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not load more events.");
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Audit Log" description={`${total} event${total === 1 ? "" : "s"} across all tenants`} />

      <View style={styles.searchWrap}>
        <TextField value={query} onChangeText={setQuery} placeholder="Search by action or actor…" autoCapitalize="none" autoCorrect={false} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: tabBarClearance }]}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        onEndReachedThreshold={0.4}
        onEndReached={handleLoadMore}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon={<ScrollText size={28} color={colors.mutedForeground} />}
              title="No audit events found"
              message={query ? `No events match "${query}".` : undefined}
            />
          ) : null
        }
        ListFooterComponent={
          hasMore ? (
            <Button label={loadingMore ? "Loading…" : "Load more"} variant="outline" onPress={handleLoadMore} loading={loadingMore} style={{ marginTop: 4 }} />
          ) : null
        }
        renderItem={({ item }) => <AuditRow row={item} />}
      />
    </View>
  );
}

function AuditRow({ row }: { row: AdminAuditRow }) {
  const { colors } = useTheme();
  return (
    <Card style={{ gap: 4 }}>
      <View style={styles.rowTop}>
        <Text style={[styles.action, { color: colors.foreground }]} numberOfLines={1}>
          {row.action}
        </Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>{new Date(row.occurredAt).toLocaleString()}</Text>
      </View>
      <Text style={{ color: colors.mutedForeground, fontSize: 12 }} numberOfLines={1}>
        {row.tenantName} {row.category ? `· ${row.category}` : ""} {row.actorId ? `· ${row.actorId}` : ""}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  searchWrap: { paddingHorizontal: 20, paddingTop: 14 },
  list: { padding: 20, flexGrow: 1 },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: 48 },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  action: { fontSize: 14, fontWeight: "700", flexShrink: 1 },
});
