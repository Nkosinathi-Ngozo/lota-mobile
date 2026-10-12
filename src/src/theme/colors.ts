// Design tokens mirrored 1:1 from the web app's Tailwind theme
// (f/lota/src/styles.css), converted from oklch to hex so React Native
// can consume them directly. Keep these in sync if the web palette changes.

export const palette = {
  light: {
    background: "#FFFFFF",
    foreground: "#020618",
    card: "#FFFFFF",
    cardForeground: "#020618",
    primary: "#1976D2",
    primaryForeground: "#F8FAFC",
    secondary: "#F1F5F9",
    secondaryForeground: "#1D293D",
    muted: "#F1F5F9",
    mutedForeground: "#62748E",
    accent: "#F1F5F9",
    accentForeground: "#1D293D",
    destructive: "#E7000B",
    destructiveForeground: "#F8FAFC",
    border: "#E2E8F0",
    input: "#E2E8F0",
    ring: "#1976D2",
    success: "#00A63E",
    successForeground: "#F0FDF4",
    warning: "#D08700",
    warningForeground: "#FFFBEB",
  },
  dark: {
    background: "#020618",
    foreground: "#F8FAFC",
    card: "#0F172B",
    cardForeground: "#F8FAFC",
    primary: "#4C93E0",
    primaryForeground: "#020618",
    secondary: "#1D293D",
    secondaryForeground: "#F8FAFC",
    muted: "#1D293D",
    mutedForeground: "#90A1B9",
    accent: "#1D293D",
    accentForeground: "#F8FAFC",
    destructive: "#FF6467",
    destructiveForeground: "#020618",
    border: "#28324A",
    input: "#28324A",
    ring: "#4C93E0",
    success: "#05DF72",
    successForeground: "#032013",
    warning: "#FFB900",
    warningForeground: "#241900",
  },
} as const;

export type ThemeColors = Record<keyof typeof palette.light, string>;

// Asset/status badge colors — mirrored from f/lota/src/components/asset-badges.tsx
export const statusTint = {
  blue: { light: { text: "#1E3A8A", border: "#BEDBFF" }, dark: { text: "#BEDBFF", border: "#1E3A8A" } },
  amber: { light: { text: "#78350F", border: "#FEE685" }, dark: { text: "#FEE685", border: "#78350F" } },
  emerald: { light: { text: "#064E3B", border: "#A4F4CF" }, dark: { text: "#A4F4CF", border: "#064E3B" } },
  violet: { light: { text: "#4C1D95", border: "#DDD6FE" }, dark: { text: "#DDD6FE", border: "#4C1D95" } },
  fuchsia: { light: { text: "#701A75", border: "#F6CEEF" }, dark: { text: "#F6CEEF", border: "#701A75" } },
  rose: { light: { text: "#881337", border: "#FECCD6" }, dark: { text: "#FECCD6", border: "#881337" } },
  zinc: { light: { text: "#3F3F46", border: "#E4E4E7" }, dark: { text: "#E4E4E7", border: "#3F3F46" } },
  orange: { light: { text: "#7C2D12", border: "#FFD6A8" }, dark: { text: "#FFD6A8", border: "#7C2D12" } },
  sky: { light: { text: "#0C4A6E", border: "#BEDBFF" }, dark: { text: "#BEDBFF", border: "#0C4A6E" } },
} as const;

export type StatusTintKey = keyof typeof statusTint;
