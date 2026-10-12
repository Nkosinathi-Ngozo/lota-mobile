// Per-asset in-progress verification drafts — separate from
// verificationStore's queue (which only holds *completed* saved records).
// Keyed by asset UID so leaving mid-verification and coming back (or the
// app being killed) restores exactly where the user left off, per
// Priority 2's "Save draft" / "unsaved changes protection" requirements.
import { getJson, remove, setJson } from "@/lib/storage";
import type { MobileException } from "@/lib/verificationStore";

const DRAFT_PREFIX = "lota.mobile-verification-draft.v1.";

export type VerificationDraft = {
  condition: string;
  custodianConfirmed: boolean;
  exceptionType: MobileException;
  gps: string;
  notes: string;
  photoUri?: string;
  savedAt: string;
};

function draftKey(assetUid: string) {
  return `${DRAFT_PREFIX}${assetUid}`;
}

export function loadDraft(assetUid: string): Promise<VerificationDraft | null> {
  return getJson<VerificationDraft>(draftKey(assetUid));
}

export function saveDraft(assetUid: string, draft: Omit<VerificationDraft, "savedAt">): Promise<void> {
  return setJson(draftKey(assetUid), { ...draft, savedAt: new Date().toISOString() });
}

export function clearDraft(assetUid: string): Promise<void> {
  return remove(draftKey(assetUid));
}
