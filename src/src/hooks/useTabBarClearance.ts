import { useSafeAreaInsets } from "react-native-safe-area-context";

// FloatingTabBar renders as position:absolute so it floats on top of every
// tab screen instead of taking part in layout — which means nothing about
// <Tabs> reserves space for it, and a screen's own ScrollView/FlatList has
// no idea it's there. Every scrollable tab screen needs bottom padding at
// least this tall so its last item can scroll clear of the bar instead of
// being hidden behind it. Kept in one place so it can't drift out of sync
// with the bar's actual footprint in FloatingTabBar.tsx (pill height 44 +
// 6px vertical padding on each side of the bar + the bar's own bottom
// margin above the safe-area inset).
const BAR_CONTENT_HEIGHT = 44 + 6 * 2;
const BAR_BOTTOM_MARGIN = 10;
// Extra clearance so the last row doesn't just barely clear the bar with
// zero breathing room.
const EXTRA_CLEARANCE = 16;

export function useTabBarClearance(): number {
  const insets = useSafeAreaInsets();
  return BAR_CONTENT_HEIGHT + BAR_BOTTOM_MARGIN + insets.bottom + EXTRA_CLEARANCE;
}
