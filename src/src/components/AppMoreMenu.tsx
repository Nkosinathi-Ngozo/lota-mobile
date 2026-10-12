// Entry point for Profile, which loses its own bottom-tab slot when Team is
// shown (Admin/International Admin) so the bar stays capped at 4: Due,
// Scan, Queue, Team. For every other role Profile still fits on the bar
// directly (see (app)/_layout.tsx), so this button only renders there when
// Team is present — same header-button + bottom-sheet pattern as
// AdminMoreMenu, just a single row since there's no Audit-equivalent here.
import { useState } from "react";
import { router } from "expo-router";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EllipsisVertical, User } from "lucide-react-native";

import { useTheme } from "@/theme/ThemeProvider";

export function AppMoreMenu() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const goToProfile = () => {
    setOpen(false);
    router.push("/(app)/profile");
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.button, { backgroundColor: colors.card, borderColor: colors.border }]}
        hitSlop={8}
      >
        <EllipsisVertical size={18} color={colors.foreground} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View
            style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border, paddingBottom: insets.bottom + 20 }]}
            onStartShouldSetResponder={() => true}
          >
            <Pressable onPress={goToProfile} style={styles.row} hitSlop={4}>
              <User size={18} color={colors.foreground} />
              <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "600" }}>Profile</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, paddingTop: 16, paddingHorizontal: 8, gap: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 14, paddingVertical: 14, borderRadius: 12 },
});
