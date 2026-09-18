import { useState } from "react";
import { router } from "expo-router";
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
import { Eye, EyeOff, LockKeyhole, LogIn, User } from "lucide-react-native";

import { BrandLogo } from "@/components/BrandLogo";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/theme/ThemeProvider";

export default function LoginScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!username.trim() || !password) {
      setError("Enter your username and password.");
      return;
    }
    setError("");
    setSubmitting(true);
    const result = await login(username.trim(), password);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.replace("/(app)/verification");
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brandBlock}>
          <View style={[styles.logoCard, { backgroundColor: "#FFFFFF", borderColor: colors.border }]}>
            <BrandLogo size={72} />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>Welcome back</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Sign in to verify and track assets in the field.
          </Text>
        </View>

        <View style={styles.form}>
          <TextField
            label="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="your.username"
            returnKeyType="next"
          />

          <View style={{ gap: 6 }}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Password</Text>
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
              <Pressable onPress={() => setShowPassword((current) => !current)} style={styles.eyeButton} hitSlop={10}>
                {showPassword ? <EyeOff size={18} color={colors.mutedForeground} /> : <Eye size={18} color={colors.mutedForeground} />}
              </Pressable>
            </View>
          </View>

          {error ? (
            <View style={[styles.errorBox, { borderColor: colors.destructive, backgroundColor: colors.destructive + "1A" }]}>
              <Text style={{ color: colors.destructive, fontSize: 13 }}>{error}</Text>
            </View>
          ) : null}

          <Button label={submitting ? "Signing in…" : "Sign In"} onPress={handleSubmit} loading={submitting} icon={<LogIn size={18} color={colors.primaryForeground} />} size="lg" />
        </View>

        <View style={styles.footerHint}>
          <User size={14} color={colors.mutedForeground} />
          <LockKeyhole size={14} color={colors.mutedForeground} />
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            Your session stays on this device and syncs verification records when you're back online.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 24, gap: 32 },
  brandBlock: { alignItems: "center", gap: 12 },
  logoCard: {
    width: 104,
    height: 104,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1976D2",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  title: { fontSize: 24, fontWeight: "800", marginTop: 8 },
  subtitle: { fontSize: 14, textAlign: "center", paddingHorizontal: 16 },
  form: { gap: 16 },
  fieldLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3 },
  passwordRow: { flexDirection: "row", alignItems: "center", borderRadius: 10, borderWidth: 1, paddingRight: 8 },
  eyeButton: { padding: 8 },
  errorBox: { borderWidth: 1, borderRadius: 10, padding: 12 },
  footerHint: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 8 },
  footerText: { flex: 1, fontSize: 12, lineHeight: 16 },
});
