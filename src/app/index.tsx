import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/theme/ThemeProvider";

export default function Index() {
  const { currentUser, isReady, isImpersonating, mustChangePassword, locked } = useAuth();
  const { colors } = useTheme();

  if (!isReady) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!currentUser) return <Redirect href="/(auth)/login" />;
  // A stored session exists and biometric unlock is enabled on this device
  // — gate on that before any other redirect, so cold-starting the app
  // never lands directly on real screens without the biometric (or
  // password-fallback) check.
  if (locked) return <Redirect href="/(auth)/unlock" />;
  // A tenant admin auto-logged-in by QR onboarding (collect_grant) must set
  // a real password before anywhere else in the app is reachable — checked
  // ahead of every other redirect below, the same way isImpersonating gates
  // the admin console.
  if (mustChangePassword) return <Redirect href="/(onboard)/change-password" />;
  // A platform admin who is currently impersonating a tenant is acting as
  // an ordinary tenant user (and the backend blocks all /admin/* routes
  // while impersonating), so they land on the normal field-worker tabs,
  // not the admin console, until they return to their own session.
  if (currentUser.isPlatformAdmin && !isImpersonating) return <Redirect href="/(admin)/overview" />;
  return <Redirect href="/(app)/verification" />;
}
