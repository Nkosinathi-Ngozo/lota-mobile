import { Redirect, Tabs } from "expo-router";
import { ClipboardList, ScanLine, User, WifiOff } from "lucide-react-native";

import { useAuth } from "@/hooks/useAuth";
import { useVerificationQueue } from "@/lib/verificationStore";
import { useTheme } from "@/theme/ThemeProvider";

export default function AppLayout() {
  const { currentUser, isReady } = useAuth();
  const { colors } = useTheme();
  const { pendingCount } = useVerificationQueue();

  if (!isReady) return null;
  if (!currentUser) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen
        name="verification"
        options={{ title: "Due", tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="scan"
        options={{ title: "Scan", tabBarIcon: ({ color, size }) => <ScanLine color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="queue"
        options={{
          title: "Queue",
          tabBarIcon: ({ color, size }) => <WifiOff color={color} size={size} />,
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }}
      />
      <Tabs.Screen name="asset/[uid]" options={{ href: null }} />
    </Tabs>
  );
}
