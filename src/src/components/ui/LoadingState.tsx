// Shared loading-state layout — a couple of screens rendered bare "Loading…"
// text with no spinner; this gives every screen the same structured
// placeholder instead (see Priority 5's "no plain-text loading states").
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme/ThemeProvider";

export function LoadingState({ label }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <ActivityIndicator color={colors.primary} />
      {label ? <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
});
