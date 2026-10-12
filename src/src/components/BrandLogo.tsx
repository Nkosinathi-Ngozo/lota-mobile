import { Image } from "expo-image";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

const logoSource = require("../../assets/icon-source.png");

export function BrandLogo({ size = 64, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.wrap, { width: size, height: size }, style]}>
      <Image source={logoSource} style={{ width: "100%", height: "100%" }} contentFit="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
});
