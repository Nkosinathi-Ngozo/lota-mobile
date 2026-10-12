import * as Haptics from "expo-haptics";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AlertTriangle, ArrowLeft, Camera, CheckCircle2, MapPin, Navigation, RotateCcw, X } from "lucide-react-native";

import { AssetTypeBadge, VerificationBadge } from "@/components/AssetBadges";
import { ConfirmSheet } from "@/components/ConfirmSheet";
import { useTabBarClearance } from "@/hooks/useTabBarClearance";
import { useToast } from "@/components/Toast";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ChoiceGroup } from "@/components/ui/ChoiceGroup";
import { TextField } from "@/components/ui/TextField";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { assetsApi } from "@/lib/api";
import {
  assetFallbackLocation,
  canNavigateToLocation,
  getLocations,
  getLocationPath,
  getNearestLocation,
  locationDisplayAddress,
  openNavigationToLocation,
} from "@/lib/location-utils";
import { clearDraft, loadDraft, saveDraft, type VerificationDraft } from "@/lib/verificationDraft";
import { conditions, exceptionTypes, useVerificationQueue, type MobileException } from "@/lib/verificationStore";
import { useTheme } from "@/theme/ThemeProvider";
import type { AssetRecord } from "@/types/domain";

const CONDITION_OPTIONS = conditions.map((item) => ({ value: item, label: item }));
const EXCEPTION_OPTIONS: { value: MobileException; label: string }[] = [
  { value: "None", label: "None" },
  ...exceptionTypes.map((type) => ({ value: type, label: type })),
];

type GpsState = {
  coords: string;
  accuracy: number | null;
  capturedAt: string | null;
};

const EMPTY_GPS: GpsState = { coords: "", accuracy: null, capturedAt: null };
const MAX_CAMERA_IMAGE_EDGE = 1920;

export default function AssetDetailScreen() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const isOnline = useNetworkStatus();
  // The floating tab bar renders on top of this screen too (it's a hidden
  // sibling tab, not a real push-stack child — see FloatingTabBar.tsx), so
  // the sticky save bar's own bottom padding needs to clear it, not just
  // the safe-area inset, or the pill bar can sit on top of the Save button.
  const tabBarClearance = useTabBarClearance();
  const { addRecord, hasPendingRecord } = useVerificationQueue();

  const [asset, setAsset] = useState<AssetRecord | null>(null);
  const [assetList, setAssetList] = useState<AssetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [condition, setCondition] = useState<string>(conditions[0]);
  const [custodianConfirmed, setCustodianConfirmed] = useState(true);
  const [exceptionType, setExceptionType] = useState<MobileException>("None");
  const [gps, setGps] = useState<GpsState>(EMPTY_GPS);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [touchedNotes, setTouchedNotes] = useState(false);
  const [confirmDuplicateOpen, setConfirmDuplicateOpen] = useState(false);

  // Tracks whether the form has any change worth protecting — used to skip
  // the draft-save round trip on a screen that was opened and immediately
  // left untouched.
  const dirtyRef = useRef(false);
  const markDirty = () => {
    dirtyRef.current = true;
  };

  useEffect(() => {
    if (!uid) return;
    void (async () => {
      setLoading(true);
      try {
        const [record, records] = await Promise.all([assetsApi.get(uid), assetsApi.list()]);
        setAsset(record);
        setAssetList(records);
        const draft = await loadDraft(uid);
        if (draft) applyDraft(draft);
      } catch {
        setAsset(null);
      } finally {
        setLoading(false);
      }
    })();
    // Draft restore only needs to run once per screen instance (on the uid
    // this screen was opened with), not on every re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  function applyDraft(draft: VerificationDraft) {
    setCondition(draft.condition);
    setCustodianConfirmed(draft.custodianConfirmed);
    setExceptionType(draft.exceptionType);
    if (draft.gps) setGps({ coords: draft.gps, accuracy: null, capturedAt: draft.savedAt });
    setNotes(draft.notes);
    setPhotoUri(draft.photoUri);
    setDraftRestored(true);
  }

  // Autosave the in-progress verification as a draft whenever a field
  // changes, so leaving mid-verification (back button, app killed, a call
  // comes in) never silently loses captured evidence — restored above on
  // the next visit to this same asset.
  useEffect(() => {
    if (!uid || !dirtyRef.current) return;
    const handle = setTimeout(() => {
      void saveDraft(uid, { condition, custodianConfirmed, exceptionType, gps: gps.coords, notes, photoUri });
    }, 400);
    return () => clearTimeout(handle);
  }, [uid, condition, custodianConfirmed, exceptionType, gps.coords, notes, photoUri]);

  const captureGps = async () => {
    markDirty();
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        toast.error("Location permission was denied.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;
      setGps({ coords, accuracy: position.coords.accuracy, capturedAt: new Date().toISOString() });
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
    const result = await ImagePicker.launchCameraAsync({ quality: 1, allowsEditing: false, exif: false });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const longestEdge = Math.max(asset.width ?? 0, asset.height ?? 0);
      const resize =
        longestEdge > MAX_CAMERA_IMAGE_EDGE && asset.width && asset.height
          ? asset.width >= asset.height
            ? { width: MAX_CAMERA_IMAGE_EDGE }
            : { height: MAX_CAMERA_IMAGE_EDGE }
          : undefined;
      const optimized = await ImageManipulator.manipulateAsync(
        asset.uri,
        resize ? [{ resize }] : [],
        { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG },
      );
      markDirty();
      setPhotoUri(optimized.uri);
    }
  };

  const removePhoto = () => {
    markDirty();
    setPhotoUri(undefined);
  };

  const notesMissing = exceptionType !== "None" && !notes.trim();
  const stepsComplete = useMemo(
    () => ({
      identity: Boolean(asset),
      condition: Boolean(condition),
      custodian: true,
      evidence: Boolean(gps.coords) || Boolean(photoUri),
      exception: exceptionType === "None" || !notesMissing,
    }),
    [asset, condition, gps.coords, photoUri, exceptionType, notesMissing],
  );
  const completedCount = Object.values(stepsComplete).filter(Boolean).length;
  const totalSteps = Object.keys(stepsComplete).length;

  const runSave = useCallback(async () => {
    if (!asset) return;
    setSaving(true);
    await addRecord({
      assetUid: asset.uid,
      assetName: asset.name,
      result: exceptionType === "None" ? "Verified" : "Exception",
      condition,
      custodianConfirmed,
      gps: gps.coords || "Not captured",
      exceptionType,
      notes: notes.trim(),
      photoUri,
    });
    await clearDraft(asset.uid);
    setSaving(false);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    toast.success(
      isOnline ? "Verification saved and queued to sync." : "Verification saved on this device. Sync when you're back online.",
    );
    router.back();
  }, [asset, addRecord, exceptionType, condition, custodianConfirmed, gps.coords, notes, photoUri, isOnline, toast]);

  const handleSavePress = () => {
    if (!asset) return;
    if (notesMissing) {
      setTouchedNotes(true);
      toast.error("Add exception notes before saving.");
      return;
    }
    if (hasPendingRecord(asset.uid)) {
      setConfirmDuplicateOpen(true);
      return;
    }
    void runSave();
  };

  const handleBack = () => {
    if (dirtyRef.current && asset) {
      toast.info("Draft saved. Pick this asset up again to continue.");
    }
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

  const saveLabel = saving ? "Saving…" : isOnline ? "Save and Sync" : "Save to Sync Queue";
  const selectedLocation = getNearestLocation(asset, assetList);
  const locations = getLocations(assetList);
  const locationLabel = selectedLocation ? getLocationPath(locations, selectedLocation.uid) || selectedLocation.name : assetFallbackLocation(asset);
  const locationAddress = locationDisplayAddress(selectedLocation);
  const canNavigate = canNavigateToLocation(selectedLocation);

  const handleNavigateToLocation = async () => {
    if (!selectedLocation) {
      toast.error("No registered location is linked to this asset.");
      return;
    }
    try {
      await openNavigationToLocation(selectedLocation, locationLabel || asset.name);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open navigation for this location.");
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderColor: colors.border, backgroundColor: colors.background }]}>
        <Pressable onPress={handleBack} hitSlop={10} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Back">
          <ArrowLeft size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
          {asset.uid}
        </Text>
        <View style={{ width: 20 }} />
      </View>

      <View style={[styles.progressWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${(completedCount / totalSteps) * 100}%` }]} />
        </View>
        <Text style={{ color: colors.mutedForeground, fontSize: 11, fontWeight: "600" }}>
          {completedCount} of {totalSteps} steps ready
        </Text>
      </View>

      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.scroll}>
        {draftRestored ? (
          <Card style={[styles.draftBanner, { backgroundColor: colors.warning + "14", borderColor: colors.warning }]}>
            <RotateCcw size={16} color={colors.warning} />
            <Text style={{ color: colors.foreground, fontSize: 12, flex: 1 }}>
              Restored a draft from earlier. Review before saving.
            </Text>
          </Card>
        ) : null}

        <StepSection number={1} title="Confirm asset identity" done={stepsComplete.identity}>
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
          <Card style={styles.locationCard}>
            <View style={styles.locationHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Selected Location</Text>
                <Text style={[styles.locationTitle, { color: colors.foreground }]} numberOfLines={2}>
                  {locationLabel || "Unassigned"}
                </Text>
              </View>
              <MapPin size={18} color={canNavigate ? colors.success : colors.mutedForeground} />
            </View>
            {locationAddress ? (
              <Text style={[styles.locationAddress, { color: colors.mutedForeground }]}>{locationAddress}</Text>
            ) : (
              <Text style={[styles.locationAddress, { color: colors.mutedForeground }]}>
                Resolve this location's address in Location Management before using navigation.
              </Text>
            )}
            <Button
              label="Navigate to Location"
              variant="outline"
              icon={<Navigation size={16} color={colors.foreground} />}
              onPress={handleNavigateToLocation}
              disabled={!canNavigate}
            />
          </Card>
        </StepSection>

        <StepSection number={2} title="Confirm condition" done={stepsComplete.condition}>
          <ChoiceGroup
            value={condition}
            options={CONDITION_OPTIONS}
            onChange={(value) => {
              markDirty();
              setCondition(value);
            }}
            accessibilityLabel="Asset condition"
          />
        </StepSection>

        <StepSection number={3} title="Confirm custodian" done={stepsComplete.custodian}>
          <ChoiceGroup
            value={custodianConfirmed ? "yes" : "no"}
            options={[
              { value: "yes", label: "Custodian Confirmed" },
              { value: "no", label: "Custodian Disputed" },
            ]}
            onChange={(value) => {
              markDirty();
              setCustodianConfirmed(value === "yes");
            }}
            accessibilityLabel="Custodian confirmation"
          />
        </StepSection>

        <StepSection number={4} title="Capture evidence" done={stepsComplete.evidence} optional>
          <View style={{ gap: 6 }}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>GPS Location</Text>
            {gps.coords ? (
              <Card style={styles.evidenceCard}>
                <MapPin size={16} color={colors.success} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "600" }}>{gps.coords}</Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>
                    {gps.accuracy ? `±${Math.round(gps.accuracy)}m accuracy` : "Accuracy unknown"}
                    {gps.capturedAt ? ` · ${new Date(gps.capturedAt).toLocaleTimeString()}` : ""}
                  </Text>
                </View>
                <Button
                  variant="outline"
                  size="icon"
                  icon={<RotateCcw size={16} color={colors.foreground} />}
                  onPress={captureGps}
                  loading={gpsLoading}
                  accessibilityLabel="Retry GPS capture"
                />
              </Card>
            ) : (
              <Button
                variant="outline"
                label="Capture GPS Location"
                icon={<MapPin size={18} color={colors.foreground} />}
                onPress={captureGps}
                loading={gpsLoading}
              />
            )}
          </View>

          <View style={{ gap: 6, marginTop: 14 }}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Photo Evidence</Text>
            {photoUri ? (
              <View style={{ gap: 8 }}>
                <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <Button label="Retake" variant="outline" onPress={capturePhoto} style={{ flex: 1 }} />
                  <Button
                    label="Remove"
                    variant="outline"
                    icon={<X size={16} color={colors.destructive} />}
                    onPress={removePhoto}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            ) : (
              <Button variant="outline" label="Capture Photo" icon={<Camera size={18} color={colors.foreground} />} onPress={capturePhoto} />
            )}
          </View>
        </StepSection>

        <StepSection number={5} title="Exception (if any)" done={stepsComplete.exception}>
          <ChoiceGroup
            value={exceptionType}
            options={EXCEPTION_OPTIONS}
            onChange={(value) => {
              markDirty();
              setExceptionType(value);
              if (value === "None") setTouchedNotes(false);
            }}
            accessibilityLabel="Exception type"
          />

          {exceptionType !== "None" ? (
            <View style={{ marginTop: 12 }}>
              <TextField
                label="Exception notes (required)"
                value={notes}
                onChangeText={(text) => {
                  markDirty();
                  setNotes(text);
                }}
                onBlur={() => setTouchedNotes(true)}
                placeholder="Describe what you found…"
                multiline
                numberOfLines={4}
                style={[
                  { minHeight: 96, textAlignVertical: "top" },
                  notesMissing && touchedNotes ? { borderColor: colors.destructive } : undefined,
                ]}
              />
              {notesMissing && touchedNotes ? (
                <View style={styles.inlineError}>
                  <AlertTriangle size={13} color={colors.destructive} />
                  <Text style={{ color: colors.destructive, fontSize: 12 }}>Notes are required for this exception.</Text>
                </View>
              ) : null}
            </View>
          ) : (
            <TextField
              label="Notes (optional)"
              value={notes}
              onChangeText={(text) => {
                markDirty();
                setNotes(text);
              }}
              placeholder="Condition notes…"
              multiline
              numberOfLines={3}
              style={{ minHeight: 76, textAlignVertical: "top", marginTop: 12 }}
            />
          )}
        </StepSection>
      </ScrollView>

      <View style={[styles.stickyBar, { backgroundColor: colors.background, borderColor: colors.border, paddingBottom: tabBarClearance }]}>
        {!gps.coords && !photoUri ? (
          <Text style={{ color: colors.mutedForeground, fontSize: 11, textAlign: "center", marginBottom: 8 }}>
            No GPS or photo captured yet — evidence is optional but strengthens this verification.
          </Text>
        ) : null}
        <Button label={saveLabel} onPress={handleSavePress} loading={saving} icon={<CheckCircle2 size={18} color={colors.primaryForeground} />} size="lg" />
      </View>

      <ConfirmSheet
        visible={confirmDuplicateOpen}
        title="Already pending for this asset"
        message={`${asset.uid} already has an unsynced verification saved on this device. Saving again will add a second pending record for the same asset.`}
        confirmLabel={saving ? "Saving…" : "Save anyway"}
        loading={saving}
        destructive
        onConfirm={() => {
          setConfirmDuplicateOpen(false);
          void runSave();
        }}
        onCancel={() => setConfirmDuplicateOpen(false)}
      />
    </KeyboardAvoidingView>
  );
}

function StepSection({
  number,
  title,
  done,
  optional,
  children,
}: {
  number: number;
  title: string;
  done: boolean;
  optional?: boolean;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 10 }}>
      <View style={styles.stepHeaderRow}>
        <View style={[styles.stepBadge, { backgroundColor: done ? colors.success : colors.muted, borderColor: done ? colors.success : colors.border }]}>
          {done ? <CheckCircle2 size={14} color={colors.successForeground} /> : <Text style={[styles.stepNumber, { color: colors.mutedForeground }]}>{number}</Text>}
        </View>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
        {optional ? <Badge label="Optional" tint="zinc" /> : null}
      </View>
      {children}
    </View>
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
  progressWrap: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10, gap: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  progressTrack: { height: 4, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: 4, borderRadius: 2 },
  scroll: { padding: 20, gap: 22, paddingBottom: 32 },
  draftBanner: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepHeaderRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepBadge: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  stepNumber: { fontSize: 12, fontWeight: "800" },
  assetTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  assetName: { fontSize: 18, fontWeight: "800", marginTop: 8 },
  assetMeta: { fontSize: 13, marginTop: 2 },
  locationCard: { gap: 10, marginTop: 10 },
  locationHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  locationTitle: { fontSize: 15, fontWeight: "800", marginTop: 2 },
  locationAddress: { fontSize: 12, lineHeight: 17 },
  sectionTitle: { fontSize: 14, fontWeight: "700", flex: 1 },
  fieldLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3 },
  evidenceCard: { flexDirection: "row", alignItems: "center", gap: 10 },
  photoPreview: { width: "100%", height: 180, borderRadius: 8 },
  inlineError: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  stickyBar: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 20, paddingTop: 12 },
});
