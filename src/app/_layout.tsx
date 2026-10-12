import { useCallback, useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { Stack, type ErrorBoundaryProps } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, Text, View } from "react-native";
import { AlertTriangle } from "lucide-react-native";

import { AnimatedSplash } from "@/components/AnimatedSplash";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { ToastProvider } from "@/components/Toast";
import { Button } from "@/components/ui/Button";
import { AuthProvider } from "@/hooks/useAuth";
import { usePushRegistration } from "@/hooks/usePushRegistration";
import { VerificationQueueProvider } from "@/lib/verificationStore";
import { useTheme, ThemeProvider } from "@/theme/ThemeProvider";

SplashScreen.preventAutoHideAsync().catch(() => {});

// Route-level crash recovery: expo-router mounts this in place of the tree
// below RootLayout whenever a render throws, instead of the whole app going
// to a blank white screen with no way back (see Priority 8's "release-mode
// error boundaries for route-level failures"). "Try again" clears the
// error and re-renders the same route; if that route is what's broken this
// still gets the user back to a screen where they can navigate elsewhere.
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ErrorBoundaryView error={error} retry={retry} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function ErrorBoundaryView({ error, retry }: ErrorBoundaryProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.errorRoot, { backgroundColor: colors.background, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <AlertTriangle size={40} color={colors.destructive} />
      <Text style={[styles.errorTitle, { color: colors.foreground }]}>Something went wrong</Text>
      <Text style={[styles.errorMessage, { color: colors.mutedForeground }]}>
        {__DEV__ ? error.message : "This screen ran into a problem. Your offline records are safe — try again or restart the app."}
      </Text>
      <Button label="Try again" onPress={() => void retry()} />
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <VerificationQueueProvider>
              <ToastProvider>
                <AppShell />
              </ToastProvider>
            </VerificationQueueProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppShell() {
  const { colors, scheme } = useTheme();
  usePushRegistration();
  const [showBrandSplash, setShowBrandSplash] = useState(true);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    // Native splash hides as soon as our own splash animation is mounted,
    // so the handoff between the two is invisible.
    setAppReady(true);
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  const handleFinish = useCallback(() => setShowBrandSplash(false), []);

  if (!appReady) return null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {showBrandSplash ? (
        <AnimatedSplash onFinish={handleFinish} />
      ) : (
        <>
          <ImpersonationBanner />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
        </>
      )}
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  errorRoot: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 32 },
  errorTitle: { fontSize: 17, fontWeight: "800" },
  errorMessage: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
