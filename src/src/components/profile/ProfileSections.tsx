// Shared profile-screen building blocks used by BOTH the field-worker
// profile (app/(app)/profile.tsx) and the Super Admin profile
// (app/(admin)/profile.tsx) — everything here (edit profile, account info,
// notifications, appearance, about) applies identically to any signed-in
// user regardless of role. Data & sync (the offline verification queue) is
// deliberately NOT here — a platform admin's tenant has no real asset/
// verification workload (see admin's own profile screen), so that section
// stays local to the field-worker profile only.
import { useEffect, useState } from "react";
import Constants from "expo-constants";
import * as Application from "expo-application";
import { Platform, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { Bell, Eye, EyeOff, FileText, Pencil, ScanFace } from "lucide-react-native";

import { useToast } from "@/components/Toast";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { TextField } from "@/components/ui/TextField";
import { useAuth } from "@/hooks/useAuth";
import { apiBaseUrl, ApiError, updateMeApi } from "@/lib/api";
import {
  getBiometricAvailability,
  isBiometricUnlockEnabled,
  promptBiometricUnlock,
  setBiometricUnlockEnabled,
} from "@/lib/biometrics";
import { useNotificationPrefs, type NotificationPrefs } from "@/lib/notificationPrefs";
import { useVerificationQueue } from "@/lib/verificationStore";
import { useTheme, type ThemeMode } from "@/theme/ThemeProvider";

export function SectionTitle({ children }: { children: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{children}</Text>;
}

export function InfoRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.infoRow}>
      <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "600", flexShrink: 1, textAlign: "right" }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export function EditProfileSection() {
  const { colors } = useTheme();
  const toast = useToast();
  const { currentUser, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(currentUser?.displayName ?? "");
  const [email, setEmail] = useState(currentUser?.email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const startEditing = () => {
    setDisplayName(currentUser?.displayName ?? "");
    setEmail(currentUser?.email ?? "");
    setCurrentPassword("");
    setNewPassword("");
    setShowPasswordFields(false);
    setEditing(true);
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      toast.error("Enter your name.");
      return;
    }
    if (!email.trim()) {
      toast.error("Enter your email address.");
      return;
    }
    if (showPasswordFields && newPassword && !currentPassword) {
      toast.error("Enter your current password to set a new one.");
      return;
    }
    setSaving(true);
    try {
      await updateMeApi({
        displayName: displayName.trim(),
        email: email.trim(),
        currentPassword: showPasswordFields && newPassword ? currentPassword : undefined,
        newPassword: showPasswordFields && newPassword ? newPassword : undefined,
      });
      await refreshUser();
      toast.success("Profile updated.");
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update your profile.");
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <Card style={{ gap: 10 }}>
        <View style={styles.rowBetween}>
          <SectionTitle>Profile</SectionTitle>
          <Pressable onPress={startEditing} hitSlop={8} style={styles.editLink}>
            <Pencil size={14} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "600" }}>Edit</Text>
          </Pressable>
        </View>
        <InfoRow label="Name" value={currentUser?.displayName ?? "—"} />
        <InfoRow label="Username" value={currentUser?.username ?? "—"} />
        <InfoRow label="Email" value={currentUser?.email ?? "—"} />
      </Card>
    );
  }

  return (
    <Card style={{ gap: 14 }}>
      <SectionTitle>Edit profile</SectionTitle>

      <TextField label="Name" value={displayName} onChangeText={setDisplayName} placeholder="Your name" />
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        placeholder="name@example.com"
      />

      {showPasswordFields ? (
        <>
          <TextField
            label="Current password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            placeholder="••••••••"
          />
          <View style={{ gap: 6 }}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>New password</Text>
            <View style={[styles.passwordRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <TextField
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                placeholder="At least 8 characters"
                bare
                containerStyle={{ flex: 1 }}
              />
              <Pressable
                onPress={() => setShowPassword((current) => !current)}
                style={styles.eyeButton}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} color={colors.mutedForeground} /> : <Eye size={18} color={colors.mutedForeground} />}
              </Pressable>
            </View>
          </View>
        </>
      ) : (
        <Pressable onPress={() => setShowPasswordFields(true)} hitSlop={8}>
          <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "600" }}>Change password</Text>
        </Pressable>
      )}

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Button label="Cancel" variant="outline" onPress={() => setEditing(false)} style={{ flex: 1 }} disabled={saving} />
        <Button label={saving ? "Saving…" : "Save changes"} onPress={handleSave} loading={saving} style={{ flex: 1 }} />
      </View>
    </Card>
  );
}

export function AccountInfoSection() {
  const { currentUser } = useAuth();
  return (
    <Card style={{ gap: 10 }}>
      <SectionTitle>Account</SectionTitle>
      <InfoRow label="Role" value={currentUser?.role ?? "—"} />
      <InfoRow label="Tenant" value={currentUser?.tenantName ?? "—"} />
      <InfoRow label="Mission" value={currentUser?.mission ?? "—"} />
      <InfoRow label="Department" value={currentUser?.department ?? "—"} />
      <InfoRow label="Status" value={currentUser?.status ?? "—"} />
    </Card>
  );
}

const NOTIFICATION_TOGGLES: { key: keyof NotificationPrefs; label: string; description: string }[] = [
  { key: "verificationDue", label: "Verification due", description: "Assets due for verification." },
  { key: "syncFailures", label: "Sync failures", description: "An offline record failed to sync." },
  { key: "accountActivity", label: "Account activity", description: "Password or profile changes." },
];

export function NotificationSettingsSection() {
  const { colors } = useTheme();
  const { prefs, setPref } = useNotificationPrefs();
  return (
    <Card style={{ gap: 12 }}>
      <View style={styles.rowBetween}>
        <SectionTitle>Notifications</SectionTitle>
        <Bell size={16} color={colors.mutedForeground} />
      </View>
      {NOTIFICATION_TOGGLES.map((item) => (
        <View key={item.key} style={styles.toggleRow}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}>{item.label}</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{item.description}</Text>
          </View>
          <Switch value={prefs[item.key]} onValueChange={(value) => setPref(item.key, value)} />
        </View>
      ))}
    </Card>
  );
}

export function SecuritySection() {
  const { colors } = useTheme();
  const toast = useToast();
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getBiometricAvailability(), isBiometricUnlockEnabled()]).then(([availability, isEnabled]) => {
      if (cancelled) return;
      setAvailable(availability.available);
      setEnabled(isEnabled);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!available) return null;

  const handleToggle = async (value: boolean) => {
    if (!value) {
      await setBiometricUnlockEnabled(false);
      setEnabled(false);
      return;
    }
    setBusy(true);
    const result = await promptBiometricUnlock();
    setBusy(false);
    if (!result.ok) {
      if (result.message) toast.error(result.message);
      return;
    }
    await setBiometricUnlockEnabled(true);
    setEnabled(true);
  };

  return (
    <Card style={{ gap: 12 }}>
      <View style={styles.rowBetween}>
        <SectionTitle>Security</SectionTitle>
        <ScanFace size={16} color={colors.mutedForeground} />
      </View>
      <View style={styles.toggleRow}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}>Biometric unlock</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Use Face ID or fingerprint instead of your password on this device.</Text>
        </View>
        <Switch value={enabled} onValueChange={handleToggle} disabled={busy} />
      </View>
    </Card>
  );
}

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "system", label: "Match device" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function AppearanceSection() {
  const { mode, setMode } = useTheme();
  return (
    <Card style={{ gap: 10 }}>
      <SectionTitle>Appearance</SectionTitle>
      <Select label="Theme" value={mode} options={THEME_OPTIONS} onChange={setMode} />
    </Card>
  );
}

export function AboutSection() {
  const version = Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? "—";
  const build = Application.nativeBuildVersion;
  return (
    <Card style={{ gap: 10 }}>
      <SectionTitle>About</SectionTitle>
      <InfoRow label="App version" value={build ? `${version} (${build})` : version} />
      <InfoRow label="API" value={apiBaseUrl()} />
    </Card>
  );
}

// Support diagnostics export — a plain-text bundle a field user can share
// (email, messaging app, etc.) when reporting an issue, so support doesn't
// have to ask them to read numbers off their screen one at a time. Built
// entirely from data already on-device; no crash/analytics service
// required (see Priority 9 of MOBILE_UI_UX_PRODUCTION_READINESS.md — the
// crash/analytics SDK integration itself is intentionally out of scope
// here pending a provider decision).
export function DiagnosticsSection() {
  const { colors } = useTheme();
  const toast = useToast();
  const { currentUser } = useAuth();
  const { pendingCount, syncedCount, records } = useVerificationQueue();
  const [sharing, setSharing] = useState(false);

  const buildReport = () => {
    const version = Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? "unknown";
    const build = Application.nativeBuildVersion ?? "unknown";
    const recentErrors = records
      .filter((record) => record.syncError)
      .slice(0, 5)
      .map((record) => `  - ${record.assetUid}: ${record.syncError}`)
      .join("\n");

    return [
      "LOTA Mobile Support Diagnostics",
      `Generated: ${new Date().toISOString()}`,
      "",
      `App version: ${version} (${build})`,
      `Platform: ${Platform.OS} ${Platform.Version}`,
      `API endpoint: ${apiBaseUrl()}`,
      "",
      `User: ${currentUser?.username ?? "—"} (${currentUser?.role ?? "—"})`,
      `Tenant: ${currentUser?.tenantName ?? "—"}`,
      "",
      `Pending queue records: ${pendingCount}`,
      `Synced queue records: ${syncedCount}`,
      recentErrors ? `Recent sync errors:\n${recentErrors}` : "Recent sync errors: none",
    ].join("\n");
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      await Share.share({ message: buildReport() });
    } catch {
      toast.error("Could not open the share sheet.");
    } finally {
      setSharing(false);
    }
  };

  return (
    <Card style={{ gap: 10 }}>
      <View style={styles.rowBetween}>
        <SectionTitle>Support diagnostics</SectionTitle>
        <FileText size={16} color={colors.mutedForeground} />
      </View>
      <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 17 }}>
        Share a diagnostics summary (app version, device, tenant, queue counts, recent sync errors) when reporting an issue to support. No
        credentials or verification notes are included.
      </Text>
      <Button label={sharing ? "Preparing…" : "Share diagnostics"} variant="outline" loading={sharing} onPress={() => void handleShare()} />
    </Card>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
  infoRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  editLink: { flexDirection: "row", alignItems: "center", gap: 4 },
  fieldLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3 },
  passwordRow: { flexDirection: "row", alignItems: "center", borderRadius: 10, borderWidth: 1, paddingRight: 8 },
  eyeButton: { padding: 8 },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
});
