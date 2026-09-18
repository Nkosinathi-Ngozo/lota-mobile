import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import { BrandLogo } from "@/components/BrandLogo";

// A short branded animation shown once the native splash hands off and the
// app's own JS is ready — logo scales/settles in, a scan-line sweeps
// through it (nodding to the barcode/QR scanning this app is built around),
// then the tagline fades in before the caller navigates onward.
export function AnimatedSplash({ onFinish }: { onFinish: () => void }) {
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const scanLine = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.9)).current;
  const ringOpacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 60 }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.timing(scanLine, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(taglineOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.delay(450),
    ]).start(() => onFinish());

    Animated.loop(
      Animated.parallel([
        Animated.timing(ringScale, { toValue: 1.6, duration: 1600, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(ringOpacity, { toValue: 0, duration: 1600, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]),
    ).start();
  }, [logoScale, logoOpacity, scanLine, taglineOpacity, ringScale, ringOpacity, onFinish]);

  const scanTranslate = scanLine.interpolate({ inputRange: [0, 1], outputRange: [-70, 70] });

  return (
    <LinearGradient colors={["#020618", "#0B1B3A", "#020618"]} style={styles.container}>
      <View style={styles.logoStage}>
        <Animated.View
          style={[
            styles.pulseRing,
            { transform: [{ scale: ringScale }], opacity: ringOpacity },
          ]}
        />
        <Animated.View style={[styles.logoCard, { transform: [{ scale: logoScale }], opacity: logoOpacity }]}>
          <BrandLogo size={92} />
          <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanTranslate }] }]} />
        </Animated.View>
      </View>
      <Animated.View style={{ opacity: taglineOpacity, alignItems: "center" }}>
        <Text style={styles.title}>LOTA</Text>
        <Text style={styles.tagline}>Location · Ownership · Traceability of Assets</Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 28 },
  logoStage: { alignItems: "center", justifyContent: "center", width: 180, height: 180 },
  pulseRing: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: "#4C93E0",
  },
  logoCard: {
    width: 128,
    height: 128,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#1976D2",
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  scanLine: {
    position: "absolute",
    left: 8,
    right: 8,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#4C93E0",
    shadowColor: "#4C93E0",
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: "#F8FAFC",
    letterSpacing: 4,
  },
  tagline: {
    marginTop: 6,
    fontSize: 13,
    color: "#90A1B9",
    letterSpacing: 0.4,
  },
});
