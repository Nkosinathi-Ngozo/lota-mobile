import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { SvgXml } from "react-native-svg";

import { apiBaseUrl } from "@/lib/api";
import { useTheme } from "@/theme/ThemeProvider";

// Renders a QR code for `value` by fetching the backend's existing SVG
// renderer (b/lota's GET /codes/render/qr.svg) rather than adding a
// client-side QR-generation dependency — the render endpoint is
// unauthenticated by design (encoding an already-known string into an
// image carries no secret of its own), so this needs no session.
export function QrCode({ value, size = 220 }: { value: string; size?: number }) {
  const { colors } = useTheme();
  const [xml, setXml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setXml(null);
    fetch(`${apiBaseUrl()}/codes/render/qr.svg?value=${encodeURIComponent(value)}`)
      .then((response) => response.text())
      .then((text) => {
        if (!cancelled) setXml(text);
      })
      .catch(() => {
        if (!cancelled) setXml(null);
      });
    return () => {
      cancelled = true;
    };
  }, [value]);

  if (!xml) {
    return (
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return <SvgXml xml={xml} width={size} height={size} />;
}
