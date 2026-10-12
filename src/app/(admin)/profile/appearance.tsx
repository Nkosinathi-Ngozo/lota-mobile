import { router } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";

import { useTabBarClearance } from "@/hooks/useTabBarClearance";
import { SubScreenHeader } from "@/components/SubScreenHeader";
import { AppearanceSection } from "@/components/profile/ProfileSections";
import { useTheme } from "@/theme/ThemeProvider";

export default function AppearanceSettingsScreen() {
  const { colors } = useTheme();
  const tabBarClearance = useTabBarClearance();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Explicit target: see (admin)/profile/account.tsx's comment. */}
      <SubScreenHeader title="Appearance" onBack={() => router.push("/(admin)/profile")} />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: tabBarClearance }]}>
        <AppearanceSection />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, gap: 16 },
});
