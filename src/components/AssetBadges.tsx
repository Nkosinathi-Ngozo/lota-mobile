// Mirrors f/lota/src/components/asset-badges.tsx status->color mapping.
import { Badge } from "@/components/ui/Badge";
import type { StatusTintKey } from "@/theme/colors";
import type { ComplianceStatus, LifecycleStatus, VerificationStatus } from "@/types/domain";

const lifecycleTint: Partial<Record<LifecycleStatus, StatusTintKey>> = {
  Future: "sky",
  Draft: "zinc",
  Active: "emerald",
  WIP: "violet",
  "In Verification": "blue",
  Exception: "rose",
  "Due Maintenance": "amber",
  "In Maintenance": "amber",
  "Pending Compliance": "sky",
  "Disposal Candidate": "orange",
  "Pending Disposal": "orange",
  "Active - Verified": "emerald",
  "Disposal Recommended": "orange",
  "Expiring Soon": "amber",
  Expired: "rose",
  "Pending Approval": "sky",
  Renewed: "emerald",
  Terminated: "zinc",
  "Under Review": "violet",
  Capitalised: "blue",
  Disposed: "zinc",
  Archived: "zinc",
};

export function LifecycleBadge({ status }: { status: LifecycleStatus }) {
  return <Badge label={status} tint={lifecycleTint[status] ?? "zinc"} />;
}

const verificationTint: Record<VerificationStatus, StatusTintKey> = {
  Verified: "emerald",
  Due: "amber",
  Overdue: "rose",
  "Maintenance Verified": "emerald",
  "Not Required": "zinc",
};

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  return <Badge label={status} tint={verificationTint[status]} />;
}

const complianceTint: Record<ComplianceStatus, StatusTintKey> = {
  Compliant: "emerald",
  Exception: "rose",
  "Pending Review": "amber",
  "Pending Verification": "sky",
  Rejected: "rose",
  "More Information Required": "amber",
  "Returned to WIP": "orange",
};

export function ComplianceBadge({ status }: { status: ComplianceStatus }) {
  return <Badge label={status} tint={complianceTint[status]} />;
}

const typeTint: Record<string, StatusTintKey> = {
  Property: "blue",
  "Immovable Asset": "blue",
  Lease: "amber",
  "Movable Asset": "emerald",
  "Intangible Assets": "violet",
  "Special Assets": "fuchsia",
  Obligation: "rose",
};

export function AssetTypeBadge({ type }: { type: string }) {
  return <Badge label={type} tint={typeTint[type] ?? "zinc"} />;
}
