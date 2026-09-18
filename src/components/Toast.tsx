// Minimal toast system standing in for `sonner` on web — same call sites
// (toast.success / toast.error / toast.info) used throughout the app.
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react-native";

import { useTheme } from "@/theme/ThemeProvider";

type ToastKind = "success" | "error" | "info" | "warning";
type ToastItem = { id: number; kind: ToastKind; message: string };

type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const insets = useSafeAreaInsets();

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = idRef.current++;
    setItems((current) => [...current, { id, kind, message }]);
    setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), 3200);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push("success", message),
      error: (message) => push("error", message),
      info: (message) => push("info", message),
      warning: (message) => push("warning", message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <View pointerEvents="none" style={[styles.stack, { top: insets.top + 8 }]}>
        {items.map((item) => (
          <ToastBubble key={item.id} item={item} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

function ToastBubble({ item }: { item: ToastItem }) {
  const { colors, scheme } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;

  useState(() => {
    Animated.spring(opacity, { toValue: 1, useNativeDriver: true, friction: 8 }).start();
  });

  const tone = {
    success: { bg: scheme === "dark" ? "#052e1c" : "#F0FDF4", border: colors.success, icon: CheckCircle2 },
    error: { bg: scheme === "dark" ? "#3a0a0a" : "#FEF2F2", border: colors.destructive, icon: XCircle },
    warning: { bg: scheme === "dark" ? "#2b1c00" : "#FFFBEB", border: colors.warning, icon: AlertTriangle },
    info: { bg: colors.card, border: colors.border, icon: Info },
  }[item.kind];

  const Icon = tone.icon;

  return (
    <Animated.View style={[styles.toast, { backgroundColor: tone.bg, borderColor: tone.border, opacity }]}>
      <Icon size={16} color={tone.border} />
      <Text style={[styles.text, { color: colors.foreground }]} numberOfLines={3}>
        {item.message}
      </Text>
    </Animated.View>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

const styles = StyleSheet.create({
  stack: { position: "absolute", left: 12, right: 12, gap: 8, zIndex: 100 },
  toast: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  text: { flex: 1, fontSize: 14, fontWeight: "500" },
});
