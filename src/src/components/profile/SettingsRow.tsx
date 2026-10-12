// A single tappable row in the Profile settings list — replaces a full
// Card-per-section laid out in one long scroll. Each row pushes to its own
// sub-screen instead, so Profile itself stays short and Sign Out never
// needs to be scrolled to (see MOBILE_UI_UX_PRODUCTION_READINESS.md
// Priority 5/screen-level "Profile" notes).
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";

import { useTheme } from "@/theme/ThemeProvider";

export function SettingsRow({
  icon,
  label,
  value,
  onPress,
  accessibilityLabel,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress: () => void;
  accessibilityLabel?: string;
  /** Suppresses the row divider — pass on the last row in a group so it doesn't draw a trailing line before the card's own edge. */
  last?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderColor: colors.border, opacity: pressed ? 0.6 : 1 },
        last && styles.rowLast,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.muted }]}>{icon}</View>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      {value ? (
        <Text style={[styles.value, { color: colors.mutedForeground }]} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      <ChevronRight size={18} color={colors.mutedForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
  },
  rowLast: { borderBottomWidth: 0 },
  iconWrap: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  label: { flex: 1, fontSize: 15, fontWeight: "600" },
  value: { fontSize: 13, maxWidth: 140 },
});
