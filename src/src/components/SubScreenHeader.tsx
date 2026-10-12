// Header for a screen pushed on top of a tab (Settings sub-pages, etc.):
// back button + centered title, distinct from ScreenHeader (used for the
// top-level tab screens themselves, which have no back action).
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";

import { useTheme } from "@/theme/ThemeProvider";

export function SubScreenHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 8, borderColor: colors.border, backgroundColor: colors.background }]}>
      <Pressable onPress={onBack ?? (() => router.back())} hitSlop={10} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Back">
        <ArrowLeft size={20} color={colors.foreground} />
      </Pressable>
      <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
        {title}
      </Text>
      <View style={{ width: 20 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: { padding: 4 },
  title: { fontSize: 16, fontWeight: "700", flex: 1, textAlign: "center" },
});
