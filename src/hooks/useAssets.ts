import { useCallback, useEffect, useState } from "react";

import { assetsApi } from "@/lib/api";
import type { AssetRecord } from "@/types/domain";

export function useDueAssets() {
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await assetsApi.list();
      setAssets(all);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load assets.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const dueAssets = assets.filter((asset) => asset.verificationStatus === "Due" || asset.verificationStatus === "Overdue");

  return { assets, dueAssets, loading, error, reload: load };
}

export function findScannedAsset(assets: AssetRecord[], value: string) {
  const needle = value.trim().toLowerCase();
  if (!needle) return undefined;
  return assets.find((item) => [item.uid, item.barcode, item.qrCode].filter(Boolean).some((key) => key?.toLowerCase() === needle));
}
