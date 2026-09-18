// Mirrors the subset of f/lota/src/lib/mock-data.ts (AssetRecord) and
// f/lota/src/lib/rbac.ts (AppUser) the mobile app actually consumes.
// Keep field names identical to the web app's API contract.

export type AssetType =
  | "Movable Asset"
  | "Immovable Asset"
  | "Intangible Assets"
  | "Special Assets"
  | "Lease"
  | "Property"
  | "Obligation";

export type VerificationStatus = "Verified" | "Due" | "Overdue" | "Maintenance Verified" | "Not Required";

export type LifecycleStatus =
  | "Future"
  | "Draft"
  | "Active"
  | "WIP"
  | "In Verification"
  | "Exception"
  | "Due Maintenance"
  | "In Maintenance"
  | "Pending Compliance"
  | "Disposal Candidate"
  | "Pending Disposal"
  | "Active - Verified"
  | "Disposal Recommended"
  | "Expiring Soon"
  | "Expired"
  | "Pending Approval"
  | "Renewed"
  | "Terminated"
  | "Under Review"
  | "Capitalised"
  | "Disposed"
  | "Archived";

export type ComplianceStatus =
  | "Compliant"
  | "Exception"
  | "Pending Review"
  | "Pending Verification"
  | "Rejected"
  | "More Information Required"
  | "Returned to WIP";

export interface AssetAttachment {
  name: string;
  type: string;
  label?: string;
  date: string;
  size?: number;
  dataUrl?: string;
}

export interface AssetRecord {
  uid: string;
  parentUid?: string;
  rootUid?: string;
  locationId?: string;
  name: string;
  assetType: AssetType;
  assetClass: string;
  category: string;
  description: string;
  region: string;
  country: string;
  mission?: string;
  building?: string;
  floor?: string;
  room?: string;
  custodian?: string;
  department?: string;
  currency: string;
  currentValue: number;
  lifecycleStatus: LifecycleStatus;
  verificationStatus: VerificationStatus;
  complianceStatus: ComplianceStatus;
  barcode?: string;
  qrCode?: string;
  documents: AssetAttachment[];
  photos?: AssetAttachment[];
  audit: { date: string; user: string; action: string; note?: string }[];
  verificationHistory?: { date: string; verifier: string; result: string }[];
  verificationExceptions?: {
    date: string;
    type: VerificationExceptionType;
    note: string;
    status: "Open" | "Reconciled" | "Escalated";
  }[];
}

export type VerificationExceptionType =
  | "Not Found"
  | "Found Not on List"
  | "Wrong Location"
  | "Wrong Custodian"
  | "Damaged"
  | "No Tag"
  | "Duplicate Tag";

export type AppUser = {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  role: string;
  status: "Active" | "Suspended" | "Locked";
  isPlatformAdmin?: boolean;
  tenantId?: string;
  tenantSlug?: string;
  tenantName?: string;
};

export type TenantSummary = {
  id: string;
  name: string;
  slug: string;
  status: string;
};
