import { useState } from "react";
import { router } from "expo-router";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react-native";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useAuth } from "@/hooks/useAuth";
import { ApiError, firstPasswordSetApi } from "@/lib/api";
import { useTheme } from "@/theme/ThemeProvider";

// Forced first-password-change screen for a QR-onboarded tenant admin —
// app/index.tsx routes here ahead of every other screen whenever the
// session's mustChangePassword flag is set (see useAuth's refresh()). The
// account is already active and signed in; this only replaces the
// system-generated placeholder password via POST /auth/first-password-set,
// which takes no currentPassword since the user was never shown one.
export default function OnboardChangePasswordScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { currentUser, clearMustChangePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!password) {
      setError("Choose a password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const updated = await firstPasswordSetApi(password);
      await clearMustChangePassword(updated);
      router.replace("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not set your password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerBlock}>
          <ShieldCheck size={40} color={colors.primary} />
          <Text style={[styles.title, { color: colors.foreground }]}>Welcome, {currentUser?.displayName ?? "there"}</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Your account is set up. Choose a password to finish securing it before you continue.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={{ gap: 6 }}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>New password</Text>
            <View style={[styles.passwordRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <TextField
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder="••••••••"
                autoCapitalize="none"
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

          <TextField
            label="Confirm password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
            placeholder="••••••••"
            autoCapitalize="none"
            returnKeyType="send"
            onSubmitEditing={handleSubmit}
          />

          {error ? (
            <View style={[styles.messageBox, { borderColor: colors.destructive, backgroundColor: colors.destructive + "1A" }]}>
              <Text style={{ color: colors.destructive, fontSize: 13 }}>{error}</Text>
            </View>
          ) : null}

          <Button
            label={submitting ? "Saving…" : "Set password and continue"}
            onPress={handleSubmit}
            loading={submitting}
            icon={<KeyRound size={18} color={colors.primaryForeground} />}
            size="lg"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 24, gap: 28 },
  headerBlock: { gap: 8, alignItems: "center" },
  title: { fontSize: 22, fontWeight: "800", textAlign: "center" },
  subtitle: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  form: { gap: 16 },
  fieldLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3 },
  passwordRow: { flexDirection: "row", alignItems: "center", borderRadius: 10, borderWidth: 1, paddingRight: 8 },
  eyeButton: { padding: 8 },
  messageBox: { borderWidth: 1, borderRadius: 10, padding: 12 },
});
