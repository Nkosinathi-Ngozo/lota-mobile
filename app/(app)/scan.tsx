import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ScanLine } from "lucide-react-native";

import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { codesApi } from "@/lib/api";
import { useTheme } from "@/theme/ThemeProvider";

export default function ScanScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const [permission, requestPermission] = useCameraPermissions();
  const [manualValue, setManualValue] = useState("");
  const [status, setStatus] = useState("Point the camera at an asset barcode or QR code.");
  const [checking, setChecking] = useState(false);
  const lockRef = useRef(false);

  const openAsset = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      if (!trimmed || lockRef.current) return;
      lockRef.current = true;
      setChecking(true);
      try {
        const result = await codesApi.validate(trimmed);
        if (result.valid && result.entityType === "asset" && result.entity) {
          toast.success(`Scanned ${result.entity.uid}. Opening verification.`);
          router.push({ pathname: "/(app)/asset/[uid]", params: { uid: result.entity.uid } });
          setManualValue("");
          setStatus("Point the camera at an asset barcode or QR code.");
        } else {
          setStatus(`Scanned "${trimmed}" — no matching asset found. Try again.`);
          toast.error("Scanned code does not match an asset.");
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not validate the scanned code.");
      } finally {
        setChecking(false);
        setTimeout(() => {
          lockRef.current = false;
        }, 1200);
      }
    },
    [toast],
  );

  if (!permission) {
    return <View style={[styles.center, { backgroundColor: colors.background }]} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, gap: 16, paddingHorizontal: 32 }]}>
        <ScanLine size={40} color={colors.mutedForeground} />
        <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700", textAlign: "center" }}>Camera access needed</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 13, textAlign: "center" }}>
          LOTA needs the camera to scan asset barcodes and QR codes for verification.
        </Text>
        <Button label="Grant Camera Access" onPress={requestPermission} />
        <ManualEntry value={manualValue} onChange={setManualValue} onSubmit={openAsset} loading={checking} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr", "code128", "code39", "ean13", "ean8", "upc_a", "upc_e"] }}
        onBarcodeScanned={({ data }) => void openAsset(data)}
      />
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.frame} />
      </View>
      <View style={styles.footer}>
        <Text style={styles.statusText}>{status}</Text>
        <ManualEntry value={manualValue} onChange={setManualValue} onSubmit={openAsset} loading={checking} dark />
      </View>
    </View>
  );
}

function ManualEntry({
  value,
  onChange,
  onSubmit,
  loading,
  dark,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  loading: boolean;
  dark?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.manualRow}>
      <TextField
        placeholder="Or enter UID / barcode manually…"
        value={value}
        onChangeText={onChange}
        autoCapitalize="characters"
        onSubmitEditing={() => onSubmit(value)}
        containerStyle={{ flex: 1 }}
        style={dark ? { backgroundColor: "#111827", borderColor: "#374151", color: "#F8FAFC" } : undefined}
        placeholderTextColor={dark ? "#9CA3AF" : undefined}
      />
      <Button label="Open" onPress={() => onSubmit(value)} loading={loading} disabled={!value.trim()} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  overlay: { flex: 1, alignItems: "center", justifyContent: "center" },
  frame: {
    width: 240,
    height: 240,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: "#4C93E0",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
    paddingBottom: 40,
    gap: 12,
    backgroundColor: "rgba(2,6,24,0.85)",
  },
  statusText: { color: "#F8FAFC", fontSize: 13, textAlign: "center" },
  manualRow: { flexDirection: "row", gap: 8, alignItems: "flex-end" },
});
