import { Redirect, Tabs } from "expo-router";
import { ClipboardList, ScanLine, User, Users, WifiOff } from "lucide-react-native";

import { FloatingTabBar } from "@/components/FloatingTabBar";
import { useAuth } from "@/hooks/useAuth";
import { canManageTeam } from "@/lib/rbac";
import { useVerificationQueue } from "@/lib/verificationStore";

export default function AppLayout() {
  const { currentUser, isReady, isImpersonating } = useAuth();
  const { pendingCount } = useVerificationQueue();

  if (!isReady) return null;
  if (!currentUser) return <Redirect href="/(auth)/login" />;
  // A platform admin only ends up here while impersonating a tenant (see
  // app/index.tsx) — outside of that they belong in the admin console.
  if (currentUser.isPlatformAdmin && !isImpersonating) return <Redirect href="/(admin)/overview" />;

  // Every tenant role previously landed on the exact same 4 tabs regardless
  // of what they're actually allowed to do — an Admin got the same view as
  // a Custodian/User. The Team tab is the one addition: everything else
  // stays shared, since verification/scanning/the offline queue apply to
  // every role. Real enforcement is server-side (_ensure_admin in
  // b/lota/src/app/api/v1/users.py); this only decides what's shown.
  const showTeamTab = canManageTeam(currentUser);
  // Keeping the bar capped at 4: when Team is added for Admin/International
  // Admin, Profile moves off the bar into AppMoreMenu (see each of the 4
  // remaining screens' header) instead of becoming a 5th tab.
  const showProfileTab = !showTeamTab;

  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <FloatingTabBar {...props} />}>
      <Tabs.Screen
        name="verification"
        options={{ title: "Assets", tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="scan"
        options={{ title: "Scan", tabBarIcon: ({ color, size }) => <ScanLine color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="queue"
        options={{
          title: "Sync",
          tabBarIcon: ({ color, size }) => <WifiOff color={color} size={size} />,
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
        }}
      />
      <Tabs.Screen
        name="team"
        options={{ title: "Team", href: showTeamTab ? undefined : null, tabBarIcon: ({ color, size }) => <Users color={color} size={size} /> }}
      />
      <Tabs.Screen name="team/[grantId]" options={{ href: null }} />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", href: showProfileTab ? undefined : null, tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }}
      />
      <Tabs.Screen name="profile/account" options={{ href: null }} />
      <Tabs.Screen name="profile/security" options={{ href: null }} />
      <Tabs.Screen name="profile/notifications" options={{ href: null }} />
      <Tabs.Screen name="profile/appearance" options={{ href: null }} />
      <Tabs.Screen name="profile/data-sync" options={{ href: null }} />
      <Tabs.Screen name="profile/support" options={{ href: null }} />
      <Tabs.Screen name="asset/[uid]" options={{ href: null }} />
    </Tabs>
  );
}
