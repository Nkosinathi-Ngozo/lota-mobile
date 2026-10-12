import { router } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";

import { useTabBarClearance } from "@/hooks/useTabBarClearance";
import { SubScreenHeader } from "@/components/SubScreenHeader";
import { AboutSection, DiagnosticsSection } from "@/components/profile/ProfileSections";
import { useTheme } from "@/theme/ThemeProvider";

export default function SupportSettingsScreen() {
  const { colors } = useTheme();
  const tabBarClearance = useTabBarClearance();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Explicit target: see account.tsx's comment on why not router.back(). */}
      <SubScreenHeader title="Support & Diagnostics" onBack={() => router.push("/(app)/profile")} />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: tabBarClearance }]}>
        <DiagnosticsSection />
        <AboutSection />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, gap: 16 },
});
