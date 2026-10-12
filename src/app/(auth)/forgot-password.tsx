import { useState } from "react";
import { router } from "expo-router";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Mail } from "lucide-react-native";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { ApiError, requestPasswordResetApi } from "@/lib/api";
import { useTheme } from "@/theme/ThemeProvider";

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError("Enter the email address for your account.");
      return;
    }
    setError("");
    setMessage("");
    setSubmitting(true);
    try {
      await requestPasswordResetApi(email.trim());
      setMessage("If that email address is registered, we've sent a link to reset your password. Check your inbox.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Password reset could not be started.");
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
        <Button
          label="Back to sign in"
          variant="ghost"
          icon={<ArrowLeft size={16} color={colors.foreground} />}
          onPress={() => router.back()}
          style={styles.backButton}
        />

        <View style={styles.headerBlock}>
          <Text style={[styles.title, { color: colors.foreground }]}>Reset your password</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Enter your account's email address and we'll send you a secure link to reset your password.
          </Text>
        </View>

        <View style={styles.form}>
          <TextField
            label="Email address"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="name@example.com"
            returnKeyType="send"
            onSubmitEditing={handleSubmit}
          />

          {error ? (
            <View style={[styles.messageBox, { borderColor: colors.destructive, backgroundColor: colors.destructive + "1A" }]}>
              <Text style={{ color: colors.destructive, fontSize: 13 }}>{error}</Text>
            </View>
          ) : null}

          {message ? (
            <View style={[styles.messageBox, { borderColor: "#34D399", backgroundColor: "#34D39926" }]}>
              <Text style={{ color: "#047857", fontSize: 13 }}>{message}</Text>
            </View>
          ) : null}

          <Button
            label={submitting ? "Sending…" : "Send reset link"}
            onPress={handleSubmit}
            loading={submitting}
            icon={<Mail size={18} color={colors.primaryForeground} />}
            size="lg"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 24, gap: 28 },
  backButton: { alignSelf: "flex-start", paddingHorizontal: 4 },
  headerBlock: { gap: 8 },
  title: { fontSize: 24, fontWeight: "800" },
  subtitle: { fontSize: 14, lineHeight: 20 },
  form: { gap: 16 },
  messageBox: { borderWidth: 1, borderRadius: 10, padding: 12 },
});
