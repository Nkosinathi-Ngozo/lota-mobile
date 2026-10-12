// Shared empty-state layout — replaces one-off "No X found" <Text> nodes
// scattered across list screens with a consistent icon + title + message
// shape (see Priority 5 of MOBILE_UI_UX_PRODUCTION_READINESS.md).
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme/ThemeProvider";

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  message?: string;
  action?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      {icon}
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      {message ? <Text style={[styles.message, { color: colors.mutedForeground }]}>{message}</Text> : null}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 48, paddingHorizontal: 32 },
  title: { fontSize: 15, fontWeight: "700", textAlign: "center" },
  message: { fontSize: 13, textAlign: "center", lineHeight: 18 },
});
