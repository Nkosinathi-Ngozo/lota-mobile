import { router } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";

import { useTabBarClearance } from "@/hooks/useTabBarClearance";
import { SubScreenHeader } from "@/components/SubScreenHeader";
import { AccountInfoSection, EditProfileSection } from "@/components/profile/ProfileSections";
import { useTheme } from "@/theme/ThemeProvider";

export default function AccountSettingsScreen() {
  const { colors } = useTheme();
  const tabBarClearance = useTabBarClearance();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Explicit target instead of router.back(): this screen is a
          sibling tab (href: null) under expo-router's Tabs, not a real
          child of a Profile stack, so a generic back() can resolve
          through cross-tab history to the wrong tab (e.g. Overview)
          instead of Profile. See (admin)/_layout.tsx / (app)/_layout.tsx. */}
      <SubScreenHeader title="Account" onBack={() => router.push("/(app)/profile")} />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: tabBarClearance }]}>
        <EditProfileSection />
        <AccountInfoSection />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, gap: 16 },
});
