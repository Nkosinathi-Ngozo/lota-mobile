// Offline-first verification capture store — the mobile counterpart of the
// "Mobile Verification" panel in f/lota/src/routes/verification.tsx, but
// backed by real device storage and real connectivity instead of a
// simulated online/offline toggle. Records are captured locally first and
// synced to the same /assets and exception-producing endpoints the web app
// writes to, so both surfaces update the same register.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { assetsApi } from "@/lib/api";
import { getJson, setJson } from "@/lib/storage";
import type { AssetRecord, VerificationExceptionType } from "@/types/domain";

const QUEUE_KEY = "asset-universe.mobile-verification-queue.v1";

export type MobileException = VerificationExceptionType | "None";

export type MobileVerificationRecord = {
  id: string;
  assetUid: string;
  assetName: string;
  result: "Verified" | "Exception";
  condition: string;
  custodianConfirmed: boolean;
  gps: string;
  exceptionType: MobileException;
  notes: string;
  photoUri?: string;
  capturedAt: string;
  synced: boolean;
  syncError?: string;
};

const conditions = ["Good", "Fair", "Damaged", "Missing", "Needs Maintenance"] as const;
const exceptionTypes: VerificationExceptionType[] = ["Not Found", "Found Not on List", "Wrong Location", "Wrong Custodian", "Damaged", "No Tag", "Duplicate Tag"];

export { conditions, exceptionTypes };

function requiredExceptionAction(type: VerificationExceptionType) {
  const actions: Record<VerificationExceptionType, string> = {
    "Not Found": "Investigate, reassign, mark missing or create loss case",
    "Found Not on List": "Route to reconciliation queue",
    "Wrong Location": "Propose location update for approval",
    "Wrong Custodian": "Propose custodian update for approval",
    Damaged: "Create maintenance or disposal recommendation",
    "No Tag": "Request re-tagging",
    "Duplicate Tag": "Block auto-update and escalate to asset manager",
  };
  return actions[type];
}

type QueueContextValue = {
  records: MobileVerificationRecord[];
  pendingCount: number;
  syncedCount: number;
  addRecord: (input: Omit<MobileVerificationRecord, "id" | "capturedAt" | "synced" | "syncError">) => Promise<void>;
  syncAll: (isOnline: boolean) => Promise<{ synced: number; failed: number }>;
  clearSynced: () => Promise<void>;
};

const QueueContext = createContext<QueueContextValue | null>(null);

export function VerificationQueueProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<MobileVerificationRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void (async () => {
      const stored = await getJson<MobileVerificationRecord[]>(QUEUE_KEY);
      if (stored) setRecords(stored);
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    void setJson(QUEUE_KEY, records);
  }, [records, loaded]);

  const addRecord = useCallback(async (input: Omit<MobileVerificationRecord, "id" | "capturedAt" | "synced" | "syncError">) => {
    const record: MobileVerificationRecord = {
      ...input,
      id: `MOB-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      capturedAt: new Date().toISOString(),
      synced: false,
    };
    setRecords((current) => [record, ...current]);
  }, []);

  const syncAll = useCallback(async (isOnline: boolean) => {
    if (!isOnline) return { synced: 0, failed: 0 };
    const pending = records.filter((record) => !record.synced);
    if (pending.length === 0) return { synced: 0, failed: 0 };

    let synced = 0;
    let failed = 0;
    const today = new Date().toISOString().slice(0, 10);

    for (const record of pending) {
      try {
        const asset = await assetsApi.get(record.assetUid);
        const updated = applyRecordToAsset(asset, record, today);
        await assetsApi.update(asset.uid, updated);
        setRecords((current) => current.map((item) => (item.id === record.id ? { ...item, synced: true, syncError: undefined } : item)));
        synced += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Sync failed";
        setRecords((current) => current.map((item) => (item.id === record.id ? { ...item, syncError: message } : item)));
        failed += 1;
      }
    }

    return { synced, failed };
  }, [records]);

  const clearSynced = useCallback(async () => {
    setRecords((current) => current.filter((record) => !record.synced));
  }, []);

  const pendingCount = useMemo(() => records.filter((record) => !record.synced).length, [records]);
  const syncedCount = useMemo(() => records.filter((record) => record.synced).length, [records]);

  const value = useMemo(
    () => ({ records, pendingCount, syncedCount, addRecord, syncAll, clearSynced }),
    [records, pendingCount, syncedCount, addRecord, syncAll, clearSynced],
  );

  return <QueueContext.Provider value={value}>{children}</QueueContext.Provider>;
}

export function useVerificationQueue() {
  const ctx = useContext(QueueContext);
  if (!ctx) throw new Error("useVerificationQueue must be used inside VerificationQueueProvider");
  return ctx;
}

function applyRecordToAsset(asset: AssetRecord, record: MobileVerificationRecord, today: string): AssetRecord {
  if (record.result === "Verified") {
    return {
      ...asset,
      lifecycleStatus: "Active",
      verificationStatus: "Verified",
      complianceStatus: "Compliant",
      verificationHistory: [
        ...(asset.verificationHistory ?? []),
        { date: today, verifier: "mobile verifier", result: `Mobile verified · ${record.condition} · ${record.gps}` },
      ],
      audit: [
        ...(asset.audit ?? []),
        {
          date: today,
          user: "mobile verifier",
          action: "Mobile verification synced",
          note: record.notes || `Custodian confirmed: ${record.custodianConfirmed ? "Yes" : "No"}`,
        },
      ],
    };
  }

  const type = record.exceptionType === "None" ? "Not Found" : record.exceptionType;
  const note = `${record.notes} | GPS: ${record.gps}`;
  return {
    ...asset,
    lifecycleStatus: "Exception",
    verificationStatus: "Overdue",
    complianceStatus: "Exception",
    verificationExceptions: [
      ...(asset.verificationExceptions ?? []),
      { date: today, type, note: `${note} | Required action: ${requiredExceptionAction(type)}`, status: type === "Duplicate Tag" ? "Escalated" : "Open" },
    ],
    audit: [
      ...(asset.audit ?? []),
      { date: today, user: "mobile verifier", action: `Mobile verification exception synced: ${type}`, note },
    ],
  };
}
