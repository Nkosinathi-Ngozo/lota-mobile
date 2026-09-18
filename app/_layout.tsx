import { useCallback, useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StyleSheet, View } from "react-native";

import { AnimatedSplash } from "@/components/AnimatedSplash";
import { ToastProvider } from "@/components/Toast";
import { AuthProvider } from "@/hooks/useAuth";
import { VerificationQueueProvider } from "@/lib/verificationStore";
import { useTheme, ThemeProvider } from "@/theme/ThemeProvider";

SplashScreen.preventAutoHideAsync().catch(() => {});

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
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
      )}
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
