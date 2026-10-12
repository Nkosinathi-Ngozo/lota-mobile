// Shared error-state layout for a failed list/screen load — pairs a plain
// message with a Retry action instead of leaving the user on a dead end
// (several screens previously rendered the raw error string with no way to
// recover except backing out of the screen entirely).
import { StyleSheet, Text, View } from "react-native";
import { AlertTriangle } from "lucide-react-native";

import { Button } from "@/components/ui/Button";
import { useTheme } from "@/theme/ThemeProvider";

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <AlertTriangle size={28} color={colors.destructive} />
      <Text style={[styles.message, { color: colors.foreground }]}>{message}</Text>
      {onRetry ? <Button label="Retry" variant="outline" onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 48, paddingHorizontal: 32 },
  message: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
