import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";

import { getJson, setJson } from "@/lib/storage";
import { palette, type ThemeColors } from "@/theme/colors";

export type ThemeMode = "system" | "light" | "dark";

const THEME_MODE_KEY = "lota.mobile-theme-mode.v1";

type ThemeContextValue = {
  colors: ThemeColors;
  scheme: "light" | "dark";
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    getJson<ThemeMode>(THEME_MODE_KEY).then((stored) => {
      if (stored === "light" || stored === "dark" || stored === "system") setModeState(stored);
    });
  }, []);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    void setJson(THEME_MODE_KEY, next);
  };

  const scheme: "light" | "dark" = mode === "system" ? (systemScheme === "dark" ? "dark" : "light") : mode;
  const value = useMemo(() => ({ colors: palette[scheme], scheme, mode, setMode }), [scheme, mode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
