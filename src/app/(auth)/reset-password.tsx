import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckCircle2, Eye, EyeOff, KeyRound } from "lucide-react-native";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { ApiError, confirmPasswordResetApi } from "@/lib/api";
import { useTheme } from "@/theme/ThemeProvider";

export default function ResetPasswordScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  // Arrives via the password-reset email's deep link (lota://reset-password?token=...
  // or the web fallback link opened on this device) — the user never types
  // the token in, mirroring the account-setup flow.
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!token) {
      setError("This link is invalid or has expired. Request a new one.");
      return;
    }
    if (!password) {
      setError("Enter a new password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await confirmPasswordResetApi(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Password reset could not be completed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <View style={[styles.doneContainer, { backgroundColor: colors.background, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <CheckCircle2 size={56} color="#059669" />
        <Text style={[styles.title, { color: colors.foreground, textAlign: "center" }]}>Password reset</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground, textAlign: "center" }]}>
          Your password has been reset. You can now sign in with your new password.
        </Text>
        <Button label="Go to sign in" onPress={() => router.replace("/(auth)/login")} size="lg" style={{ alignSelf: "stretch" }} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerBlock}>
          <Text style={[styles.title, { color: colors.foreground }]}>Set a new password</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Choose a new password for your account.</Text>
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
            label={submitting ? "Resetting…" : "Reset password"}
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
  headerBlock: { gap: 8 },
  title: { fontSize: 24, fontWeight: "800" },
  subtitle: { fontSize: 14, lineHeight: 20 },
  form: { gap: 16 },
  fieldLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3 },
  passwordRow: { flexDirection: "row", alignItems: "center", borderRadius: 10, borderWidth: 1, paddingRight: 8 },
  eyeButton: { padding: 8 },
  messageBox: { borderWidth: 1, borderRadius: 10, padding: 12 },
  doneContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 24 },
});
