import { Stack } from "expo-router";

// Customer-side QR onboarding: scan the operator's revealed QR code, wait
// for the operator to confirm the match phrase and approve, then collect
// real credentials and set a password. No auth session exists yet on this
// device for any of these screens — mirrors (auth)'s bare Stack.
export default function OnboardLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
