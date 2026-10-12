// Floating pill bottom nav: inactive tabs are small icon-only circles, the
// active tab expands into a pill with its icon + label — same interaction
// as the reference design, adapted from its vertical watch-style stack to a
// normal horizontal phone bottom bar, and recolored to LOTA's own theme
// tokens (colors.primary for the active fill, colors.card for the bar)
// instead of the reference's fixed black/green.
//
// Drop-in replacement for expo-router <Tabs>'s default bar: pass as
// `tabBar={(props) => <FloatingTabBar {...props} />}` on screenOptions.
// Reads each screen's existing tabBarIcon/title options unchanged, so no
// per-screen Tabs.Screen options need to change — only the bar chrome and
// the active/inactive treatment differ from the stock bar.
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useAnimatedStyle, useSharedValue, withTiming, interpolateColor } from "react-native-reanimated";
// Deep import: BottomTabBarProps isn't re-exported from the "expo-router"
// package root in this SDK version (its <Tabs> is itself flagged deprecated
// in favor of expo-router/js-tabs). The type only affects compile-time
// checking here, not runtime — if this path ever breaks on an expo-router
// upgrade, replacing it with a local shape (state/descriptors/navigation,
// matching @react-navigation/bottom-tabs' BottomTabBarProps) is a safe fix.
import type { BottomTabBarProps } from "expo-router/build/react-navigation/bottom-tabs/types";

import { useTheme } from "@/theme/ThemeProvider";

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // A screen declared with options={{ href: null }} (e.g. onboarding/[grantId],
  // team/[grantId] — detail screens reachable by push but not meant to be
  // tab buttons) never keeps a literal `href` field by the time it reaches
  // a custom tabBar: expo-router's <Tabs> strips it and rewrites it into
  // tabBarItemStyle.display:'none' + a tabBarButton that renders null (see
  // node_modules/expo-router/build/layouts/TabsClient.js) before building
  // descriptors — those are the actual signals a hidden screen leaves
  // behind, since a custom tabBar bypasses the default bar's own use of them.
  const visibleRoutes = state.routes.filter((route) => {
    const { options } = descriptors[route.key];
    const itemStyle = options.tabBarItemStyle as { display?: string } | undefined;
    return itemStyle?.display !== "none";
  });

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom + 10 }]} pointerEvents="box-none">
      <View style={[styles.bar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {visibleRoutes.map((route) => {
          const { options } = descriptors[route.key];
          const routeIndex = state.routes.findIndex((r) => r.key === route.key);
          const active = state.index === routeIndex;
          const label = (options.title ?? route.name) as string;
          const badge = options.tabBarBadge as number | string | undefined;

          const onPress = () => {
            // Mirrors the stock bottom tab bar's own onPress (see
            // node_modules/expo-router/build/react-navigation/bottom-tabs/views/BottomTabBar.js):
            // emit tabPress first so a screen's own listener can cancel the
            // switch, then navigate preserving the route's params.
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!active && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          };

          return (
            <TabButton
              key={route.key}
              active={active}
              label={label}
              badge={badge}
              onPress={onPress}
              renderIcon={(color, size) => options.tabBarIcon?.({ color, size, focused: active }) ?? null}
            />
          );
        })}
      </View>
    </View>
  );
}

function TabButton({
  active,
  label,
  badge,
  onPress,
  renderIcon,
}: {
  active: boolean;
  label: string;
  badge?: number | string;
  onPress: () => void;
  renderIcon: (color: string, size: number) => React.ReactNode;
}) {
  const { colors } = useTheme();
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(active ? 1 : 0, { duration: 220 });
  }, [active, progress]);

  const pillStyle = useAnimatedStyle(() => ({
    flexGrow: progress.value,
    backgroundColor: interpolateColor(progress.value, [0, 1], ["transparent", colors.primary]),
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    maxWidth: progress.value * 100,
    marginLeft: progress.value * 8,
  }));

  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={styles.buttonSlot}
      accessibilityRole="tab"
      accessibilityLabel={badge ? `${label}, ${badge} pending` : label}
      accessibilityState={{ selected: active }}
    >
      <Animated.View style={[styles.pill, pillStyle]}>
        <View style={styles.iconSlot}>
          {renderIcon(active ? colors.primaryForeground : colors.mutedForeground, 20)}
          {badge ? (
            <View style={[styles.badgeDot, { backgroundColor: colors.destructive, borderColor: colors.card }]}>
              <Text style={styles.badgeText} numberOfLines={1}>
                {typeof badge === "number" && badge > 9 ? "9+" : badge}
              </Text>
            </View>
          ) : null}
        </View>
        <Animated.Text style={[styles.label, { color: colors.primaryForeground }, labelStyle]} numberOfLines={1}>
          {label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    paddingHorizontal: 16,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    alignSelf: "stretch",
    borderWidth: 1,
    borderRadius: 28,
    paddingVertical: 6,
    paddingHorizontal: 6,
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  buttonSlot: {
    flexShrink: 0,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 44,
    minWidth: 44,
    paddingHorizontal: 12,
    borderRadius: 22,
    overflow: "hidden",
  },
  iconSlot: {
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    overflow: "hidden",
  },
  badgeDot: {
    position: "absolute",
    top: -6,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
});
