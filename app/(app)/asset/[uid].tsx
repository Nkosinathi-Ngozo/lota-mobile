import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Camera, CheckCircle2, MapPin } from "lucide-react-native";

import { AssetTypeBadge, VerificationBadge } from "@/components/AssetBadges";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { TextField } from "@/components/ui/TextField";
import { assetsApi } from "@/lib/api";
import { conditions, exceptionTypes, useVerificationQueue, type MobileException } from "@/lib/verificationStore";
import { useTheme } from "@/theme/ThemeProvider";
import type { AssetRecord } from "@/types/domain";

export default function AssetDetailScreen() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { addRecord } = useVerificationQueue();

  const [asset, setAsset] = useState<AssetRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [condition, setCondition] = useState<string>(conditions[0]);
  const [custodianConfirmed, setCustodianConfirmed] = useState(true);
  const [exceptionType, setExceptionType] = useState<MobileException>("None");
  const [gps, setGps] = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!uid) return;
    void (async () => {
      setLoading(true);
      try {
        const record = await assetsApi.get(uid);
        setAsset(record);
      } catch {
        setAsset(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [uid]);

  const captureGps = async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        toast.error("Location permission was denied.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;
      setGps(coords);
      toast.success("GPS captured.");
    } catch {
      toast.error("Could not read the device location.");
    } finally {
      setGpsLoading(false);
    }
  };

  const capturePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      toast.error("Camera permission was denied.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.6, allowsEditing: false });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  };

  const saveOffline = async () => {
    if (!asset) return;
    if (exceptionType !== "None" && !notes.trim()) {
      toast.error("Exception notes are required.");
      return;
    }
    setSaving(true);
    await addRecord({
      assetUid: asset.uid,
      assetName: asset.name,
      result: exceptionType === "None" ? "Verified" : "Exception",
      condition,
      custodianConfirmed,
      gps: gps || "Not captured",
      exceptionType,
      notes: notes.trim(),
      photoUri,
    });
    setSaving(false);
    toast.success("Verification saved on this device. Sync when you're back online.");
    router.back();
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!asset) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, gap: 12, paddingHorizontal: 24 }]}>
        <Text style={{ color: colors.foreground, fontWeight: "700" }}>Asset not found</Text>
        <Button label="Go back" variant="outline" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderColor: colors.border, backgroundColor: colors.background }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backButton}>
          <ArrowLeft size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
          {asset.uid}
        </Text>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.scroll}>
        <Card>
          <View style={styles.assetTop}>
            <AssetTypeBadge type={asset.assetType} />
            <VerificationBadge status={asset.verificationStatus} />
          </View>
          <Text style={[styles.assetName, { color: colors.foreground }]}>{asset.name}</Text>
          <Text style={[styles.assetMeta, { color: colors.mutedForeground }]}>
            {[asset.building, asset.room, asset.custodian].filter(Boolean).join(" · ")}
          </Text>
        </Card>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Verify this asset</Text>

        <Select label="Condition" value={condition} onChange={setCondition} options={conditions.map((item) => ({ value: item, label: item }))} />

        <Select
          label="Custodian"
          value={custodianConfirmed ? "yes" : "no"}
          onChange={(value) => setCustodianConfirmed(value === "yes")}
          options={[
            { value: "yes", label: "Custodian Confirmed" },
            { value: "no", label: "Custodian Disputed" },
          ]}
        />

        <Select
          label="Exception"
          value={exceptionType}
          onChange={(value) => setExceptionType(value as MobileException)}
          options={[{ value: "None", label: "No Exception" }, ...exceptionTypes.map((type) => ({ value: type, label: type }))]}
        />

        <View style={{ gap: 6 }}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>GPS Location</Text>
          <View style={styles.gpsRow}>
            <TextField placeholder="Not captured" value={gps} onChangeText={setGps} containerStyle={{ flex: 1 }} />
            <Button variant="outline" size="icon" icon={<MapPin size={18} color={colors.foreground} />} onPress={captureGps} loading={gpsLoading} />
          </View>
        </View>

        <View style={{ gap: 6 }}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Photo Evidence</Text>
          {photoUri ? (
            <Pressable onPress={capturePhoto}>
              <Image source={{ uri: photoUri }} style={styles.photoPreview} />
            </Pressable>
          ) : (
            <Button variant="outline" label="Capture Photo" icon={<Camera size={18} color={colors.foreground} />} onPress={capturePhoto} />
          )}
        </View>

        <TextField label="Notes" value={notes} onChangeText={setNotes} placeholder="Condition notes or exception details…" multiline numberOfLines={4} style={{ minHeight: 96, textAlignVertical: "top" }} />

        <Button
          label={saving ? "Saving…" : "Save Verification Offline"}
          onPress={saveOffline}
          loading={saving}
          icon={<CheckCircle2 size={18} color={colors.primaryForeground} />}
          size="lg"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 15, fontWeight: "700", fontFamily: "monospace", flex: 1, textAlign: "center" },
  scroll: { padding: 20, gap: 16, paddingBottom: 48 },
  assetTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  assetName: { fontSize: 18, fontWeight: "800", marginTop: 8 },
  assetMeta: { fontSize: 13, marginTop: 2 },
  sectionTitle: { fontSize: 14, fontWeight: "700", marginTop: 4 },
  fieldLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3 },
  gpsRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  photoPreview: { width: "100%", height: 180, borderRadius: 12 },
});
