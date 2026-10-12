// Entry point for Audit and Profile, which don't have their own bottom-tab
// slot anymore (the admin tab bar is capped at 4: Overview, Tenants,
// Onboard, Users — see (admin)/_layout.tsx). A small header button opens a
// bottom sheet with both, matching the app's existing Modal/bottom-sheet
// pattern (see (admin)/tenants.tsx's CreateTenantModal etc.) rather than
// introducing a new dropdown-menu component.
import { useState } from "react";
import { router } from "expo-router";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EllipsisVertical, ScrollText, User } from "lucide-react-native";

import { useTheme } from "@/theme/ThemeProvider";

export function AdminMoreMenu() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const go = (href: "/(admin)/audit" | "/(admin)/profile") => {
    setOpen(false);
    router.push(href);
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
            <MenuRow icon={ScrollText} label="Audit" onPress={() => go("/(admin)/audit")} />
            <MenuRow icon={User} label="Profile" onPress={() => go("/(admin)/profile")} />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function MenuRow({ icon: Icon, label, onPress }: { icon: typeof ScrollText; label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.row} hitSlop={4}>
      <Icon size={18} color={colors.foreground} />
      <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, paddingTop: 16, paddingHorizontal: 8, gap: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 14, paddingVertical: 14, borderRadius: 12 },
});
