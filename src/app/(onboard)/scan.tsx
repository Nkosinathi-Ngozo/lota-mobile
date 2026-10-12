import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ScanLine } from "lucide-react-native";

import { Button } from "@/components/ui/Button";
import { onboardingApi } from "@/lib/api";
import { useTheme } from "@/theme/ThemeProvider";

export default function OnboardScanScreen() {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [status, setStatus] = useState("Point the camera at the QR code your operator is showing you.");
  const [checking, setChecking] = useState(false);
  const lockRef = useRef(false);

  const claim = useCallback(async (payload: string) => {
    const trimmed = payload.trim();
    if (!trimmed || lockRef.current) return;
    lockRef.current = true;
    setChecking(true);
    try {
      const result = await onboardingApi.scan(trimmed);
      router.replace({
        pathname: "/(onboard)/waiting",
        params: { claimToken: result.claimToken, matchPhrase: result.matchPhrase, pollIntervalSeconds: String(result.pollIntervalSeconds) },
      });
    } catch {
      // Deliberately generic on this screen too, mirroring the backend's
      // indistinguishable error for invalid/wrong-kind/expired codes — this
      // screen adds no detail of its own on top of that.
      setStatus("This code is invalid or has expired. Ask your operator to show it again.");
      lockRef.current = false;
    } finally {
      setChecking(false);
    }
  }, []);

  if (!permission) {
    return <View style={[styles.center, { backgroundColor: colors.background }]} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, gap: 16, paddingHorizontal: 32 }]}>
        <ScanLine size={40} color={colors.mutedForeground} />
        <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700", textAlign: "center" }}>Camera access needed</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 13, textAlign: "center" }}>
          LOTA needs the camera to scan the onboarding QR code your operator shows you.
        </Text>
        <Button label="Grant Camera Access" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={({ data }) => void claim(data)}
      />
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.frame} />
      </View>
      <View style={styles.footer}>
        <Text style={styles.statusText}>{checking ? "Checking code…" : status}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  overlay: { flex: 1, alignItems: "center", justifyContent: "center" },
  frame: { width: 240, height: 240, borderRadius: 24, borderWidth: 3, borderColor: "#4C93E0" },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 20, paddingBottom: 40, backgroundColor: "rgba(2,6,24,0.85)" },
  statusText: { color: "#F8FAFC", fontSize: 13, textAlign: "center" },
});
