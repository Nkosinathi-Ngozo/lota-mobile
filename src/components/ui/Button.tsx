import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "@/theme/ThemeProvider";

type Variant = "default" | "outline" | "ghost" | "destructive";
type Size = "default" | "sm" | "lg" | "icon";

export function Button({
  label,
  onPress,
  variant = "default",
  size = "default",
  disabled,
  loading,
  icon,
  style,
}: {
  label?: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();

  const background =
    variant === "default" ? colors.primary : variant === "destructive" ? colors.destructive : variant === "outline" ? "transparent" : "transparent";
  const border = variant === "outline" ? colors.border : "transparent";
  const textColor =
    variant === "default" ? colors.primaryForeground : variant === "destructive" ? colors.destructiveForeground : colors.foreground;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        size === "sm" && styles.sm,
        size === "lg" && styles.lg,
        size === "icon" && styles.icon,
        { backgroundColor: background, borderColor: border, borderWidth: variant === "outline" ? 1 : 0, opacity: pressed ? 0.75 : disabled ? 0.5 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {icon}
          {label ? <Text style={[styles.label, { color: textColor }]}>{label}</Text> : null}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    minHeight: 44,
  },
  sm: { paddingVertical: 8, paddingHorizontal: 12, minHeight: 36 },
  lg: { paddingVertical: 14, paddingHorizontal: 20, minHeight: 52 },
  icon: { width: 44, height: 44, paddingHorizontal: 0, paddingVertical: 0 },
  label: { fontSize: 15, fontWeight: "600" },
});
