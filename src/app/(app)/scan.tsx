import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Flashlight, FlashlightOff, ScanLine, Settings, X } from "lucide-react-native";

import { AppMoreMenu } from "@/components/AppMoreMenu";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useAuth } from "@/hooks/useAuth";
import { codesApi } from "@/lib/api";
import { canManageTeam } from "@/lib/rbac";
import { useTheme } from "@/theme/ThemeProvider";

export default function ScanScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { currentUser } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [manualValue, setManualValue] = useState("");
  const [status, setStatus] = useState("Point the camera at an asset barcode or QR code.");
  const [checking, setChecking] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const lockRef = useRef(false);
  // This full-screen camera view has no ScreenHeader to hang AppMoreMenu off
  // of (unlike the app's other screens) — only Admin/International Admin
  // need it here, since Profile only loses its bottom-tab slot for them
  // (see (app)/_layout.tsx's showProfileTab).
  const showMoreMenu = canManageTeam(currentUser);

  const openAsset = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      if (!trimmed || lockRef.current) return;
      lockRef.current = true;
      setChecking(true);
      try {
        const result = await codesApi.validate(trimmed);
        if (result.valid && result.entityType === "asset" && result.entity) {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          toast.success(`Scanned ${result.entity.uid}. Opening verification.`);
          router.push({ pathname: "/(app)/asset/[uid]", params: { uid: result.entity.uid } });
          setManualValue("");
          setStatus("Point the camera at an asset barcode or QR code.");
        } else {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          setStatus(`Scanned "${trimmed}" — no matching asset found. Try again or use manual entry below.`);
          toast.error("Scanned code does not match an asset.");
        }
      } catch (error) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
    // canAskAgain is false once the OS permission has been permanently
    // denied (e.g. "Don't ask again" on Android, or after a prior deny on
    // iOS) — requestPermission() would just silently no-op at that point,
    // so the only way forward is the device's own Settings screen.
    const permanentlyDenied = !permission.canAskAgain;
    return (
      <View style={[styles.center, { backgroundColor: colors.background, gap: 16, paddingHorizontal: 32 }]}>
        <ScanLine size={40} color={colors.mutedForeground} />
        <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700", textAlign: "center" }}>Camera access needed</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 13, textAlign: "center" }}>
          {permanentlyDenied
            ? "Camera access was denied. Open Settings to allow LOTA to use the camera for scanning asset barcodes and QR codes."
            : "LOTA needs the camera to scan asset barcodes and QR codes for verification."}
        </Text>
        {permanentlyDenied ? (
          <Button label="Open Settings" icon={<Settings size={16} color={colors.primaryForeground} />} onPress={() => void Linking.openSettings()} />
        ) : (
          <Button label="Grant Camera Access" onPress={requestPermission} />
        )}
        <ManualEntry value={manualValue} onChange={setManualValue} onSubmit={openAsset} loading={checking} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torchOn}
        barcodeScannerSettings={{ barcodeTypes: ["qr", "code128", "code39", "ean13", "ean8", "upc_a", "upc_e"] }}
        onBarcodeScanned={({ data }) => void openAsset(data)}
      />
      <View style={[styles.topOverlay, { top: insets.top + 12 }]}>
        <Pressable
          onPress={() => setTorchOn((current) => !current)}
          style={styles.torchButton}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={torchOn ? "Turn off flashlight" : "Turn on flashlight"}
          accessibilityState={{ selected: torchOn }}
        >
          {torchOn ? <Flashlight size={18} color="#FBBF24" /> : <FlashlightOff size={18} color="#F8FAFC" />}
        </Pressable>
        {showMoreMenu ? <AppMoreMenu /> : null}
      </View>
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.frame} />
      </View>
      <View style={styles.footer}>
        <Text style={styles.statusText} accessibilityLiveRegion="polite">
          {status}
        </Text>
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
      <View style={{ flex: 1 }}>
        <TextField
          placeholder="Or enter UID / barcode manually…"
          value={value}
          onChangeText={(text) => onChange(text.toUpperCase())}
          autoCapitalize="characters"
          autoCorrect={false}
          onSubmitEditing={() => onSubmit(value)}
          style={[
            dark ? { backgroundColor: "#111827", borderColor: "#374151", color: "#F8FAFC" } : undefined,
            value ? { paddingRight: 40 } : undefined,
          ]}
          placeholderTextColor={dark ? "#9CA3AF" : undefined}
          accessibilityLabel="Manual asset UID or barcode entry"
        />
        {value ? (
          <Pressable
            onPress={() => onChange("")}
            style={styles.clearButton}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear entry"
          >
            <X size={16} color={dark ? "#9CA3AF" : colors.mutedForeground} />
          </Pressable>
        ) : null}
      </View>
      <Button label="Open" onPress={() => onSubmit(value)} loading={loading} disabled={!value.trim()} accessibilityLabel="Open scanned asset" />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  topOverlay: { position: "absolute", left: 16, right: 16, zIndex: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  torchButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(2,6,24,0.6)",
    borderWidth: 1,
    borderColor: "rgba(248,250,252,0.25)",
  },
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
  manualRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  clearButton: { position: "absolute", right: 12, top: 0, bottom: 0, justifyContent: "center" },
});
