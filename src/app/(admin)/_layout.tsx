import { Redirect, Tabs } from "expo-router";
import { Building2, LayoutDashboard, QrCode, ScrollText, User, Users } from "lucide-react-native";

import { FloatingTabBar } from "@/components/FloatingTabBar";
import { useAuth } from "@/hooks/useAuth";

export default function AdminLayout() {
  const { currentUser, isReady, isImpersonating } = useAuth();

  if (!isReady) return null;
  if (!currentUser) return <Redirect href="/(auth)/login" />;
  // Only a platform admin who isn't currently impersonating belongs in the
  // admin console — the backend itself blocks every /admin/* call while
  // impersonating (require_super_admin's chaining guard), so this mirrors
  // that on the client rather than letting someone land on dead screens.
  if (!currentUser.isPlatformAdmin || isImpersonating) return <Redirect href="/(app)/verification" />;

  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <FloatingTabBar {...props} />}>
      <Tabs.Screen
        name="overview"
        options={{ title: "Overview", tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="tenants"
        options={{ title: "Tenants", tabBarIcon: ({ color, size }) => <Building2 color={color} size={size} /> }}
      />
      <Tabs.Screen name="tenants/[tenantId]" options={{ href: null }} />
      <Tabs.Screen
        name="onboarding"
        options={{ title: "Invites", tabBarIcon: ({ color, size }) => <QrCode color={color} size={size} /> }}
      />
      <Tabs.Screen name="onboarding/[grantId]" options={{ href: null }} />
      <Tabs.Screen
        name="users"
        options={{ title: "Users", tabBarIcon: ({ color, size }) => <Users color={color} size={size} /> }}
      />
      {/* Audit and Profile are still real screens (reachable via
          AdminMoreMenu, see each of the 4 tabs' header), just no longer
          bottom-tab buttons — keeps the bar at 4 items instead of 6. */}
      <Tabs.Screen name="audit" options={{ title: "Audit", href: null, tabBarIcon: ({ color, size }) => <ScrollText color={color} size={size} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", href: null, tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }} />
      <Tabs.Screen name="profile/account" options={{ href: null }} />
      <Tabs.Screen name="profile/security" options={{ href: null }} />
      <Tabs.Screen name="profile/notifications" options={{ href: null }} />
      <Tabs.Screen name="profile/appearance" options={{ href: null }} />
      <Tabs.Screen name="profile/support" options={{ href: null }} />
    </Tabs>
  );
}
