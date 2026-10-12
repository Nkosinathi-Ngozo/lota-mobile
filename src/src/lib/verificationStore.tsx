// Offline-first verification capture store — the mobile counterpart of the
// "Mobile Verification" panel in f/lota/src/routes/verification.tsx, but
// backed by real device storage and real connectivity instead of a
// simulated online/offline toggle. Records are captured locally first and
// synced to the same /assets and exception-producing endpoints the web app
// writes to, so both surfaces update the same register.

import { File } from "expo-file-system";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { assetsApi } from "@/lib/api";
import { getJson, setJson } from "@/lib/storage";
import type { AssetRecord, VerificationExceptionType } from "@/types/domain";

const QUEUE_KEY = "lota.mobile-verification-queue.v1";

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

// Photos are captured to the app's cache directory (see asset/[uid].tsx's
// capturePhoto) and otherwise never cleaned up — left alone, evidence
// photos from every past verification would accumulate on-device forever.
// Only ever called once a record's photo is no longer reachable from the
// queue (synced-and-cleared, or deleted outright).
function cleanupPhoto(photoUri?: string) {
  if (!photoUri) return;
  try {
    const file = new File(photoUri);
    if (file.exists) file.delete();
  } catch {
    // Best-effort: a missing/already-removed file should never block
    // clearing the record it belonged to.
  }
}

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
  syncOne: (id: string) => Promise<{ ok: boolean; message?: string }>;
  clearSynced: () => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  /** True when this asset already has a pending (not-yet-synced) record on this device. */
  hasPendingRecord: (assetUid: string) => boolean;
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

  const syncRecord = useCallback(async (record: MobileVerificationRecord) => {
    const today = new Date().toISOString().slice(0, 10);
    try {
      const asset = await assetsApi.get(record.assetUid);
      const updated = applyRecordToAsset(asset, record, today);
      await assetsApi.update(asset.uid, updated);
      setRecords((current) => current.map((item) => (item.id === record.id ? { ...item, synced: true, syncError: undefined } : item)));
      return { ok: true as const };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed. Retry when you're back online.";
      setRecords((current) => current.map((item) => (item.id === record.id ? { ...item, syncError: message } : item)));
      return { ok: false as const, message };
    }
  }, []);

  const syncAll = useCallback(async (isOnline: boolean) => {
    if (!isOnline) return { synced: 0, failed: 0 };
    const pending = records.filter((record) => !record.synced);
    if (pending.length === 0) return { synced: 0, failed: 0 };

    let synced = 0;
    let failed = 0;

    for (const record of pending) {
      const result = await syncRecord(record);
      if (result.ok) synced += 1;
      else failed += 1;
    }

    return { synced, failed };
  }, [records, syncRecord]);

  const syncOne = useCallback(
    async (id: string) => {
      const record = records.find((item) => item.id === id);
      if (!record) return { ok: false, message: "Record not found." };
      const result = await syncRecord(record);
      return result.ok ? { ok: true } : { ok: false, message: result.message };
    },
    [records, syncRecord],
  );

  const clearSynced = useCallback(async () => {
    setRecords((current) => {
      current.filter((record) => record.synced).forEach((record) => cleanupPhoto(record.photoUri));
      return current.filter((record) => !record.synced);
    });
  }, []);

  const deleteRecord = useCallback(async (id: string) => {
    setRecords((current) => {
      const target = current.find((record) => record.id === id);
      if (target) cleanupPhoto(target.photoUri);
      return current.filter((record) => record.id !== id);
    });
  }, []);

  const pendingCount = useMemo(() => records.filter((record) => !record.synced).length, [records]);
  const syncedCount = useMemo(() => records.filter((record) => record.synced).length, [records]);

  const hasPendingRecord = useCallback(
    (assetUid: string) => records.some((record) => !record.synced && record.assetUid === assetUid),
    [records],
  );

  const value = useMemo(
    () => ({ records, pendingCount, syncedCount, addRecord, syncAll, syncOne, clearSynced, deleteRecord, hasPendingRecord }),
    [records, pendingCount, syncedCount, addRecord, syncAll, syncOne, clearSynced, deleteRecord, hasPendingRecord],
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
