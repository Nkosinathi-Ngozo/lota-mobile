import { router } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";

import { useTabBarClearance } from "@/hooks/useTabBarClearance";
import { SubScreenHeader } from "@/components/SubScreenHeader";
import { SecuritySection } from "@/components/profile/ProfileSections";
import { useTheme } from "@/theme/ThemeProvider";

export default function SecuritySettingsScreen() {
  const { colors } = useTheme();
  const tabBarClearance = useTabBarClearance();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Explicit target: see (admin)/profile/account.tsx's comment. */}
      <SubScreenHeader title="Security" onBack={() => router.push("/(admin)/profile")} />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: tabBarClearance }]}>
        <SecuritySection />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, gap: 16 },
});
