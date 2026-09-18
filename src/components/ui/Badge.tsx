import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme/ThemeProvider";
import { statusTint, type StatusTintKey } from "@/theme/colors";

export function Badge({ label, tint = "zinc" }: { label: string; tint?: StatusTintKey }) {
  const { scheme } = useTheme();
  const colors = statusTint[tint][scheme];
  return (
    <View style={[styles.badge, { borderColor: colors.border }]}>
      <Text style={[styles.text, { color: colors.text }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
  },
});
