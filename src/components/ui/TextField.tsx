import { StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";

import { useTheme } from "@/theme/ThemeProvider";

export function TextField({
  label,
  containerStyle,
  bare,
  style,
  ...props
}: TextInputProps & { label?: string; containerStyle?: StyleProp<ViewStyle>; bare?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.mutedForeground}
        style={[
          bare ? styles.bareInput : styles.input,
          { color: colors.foreground },
          !bare && { borderColor: colors.border, backgroundColor: colors.background },
          style,
        ]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 44,
  },
  bareInput: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 44,
  },
});
