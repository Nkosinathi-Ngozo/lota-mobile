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

export interface LocationProfile {
  locationId?: string;
  locationCode?: string;
  locationName?: string;
  locationType?: string;
  parentLocationId?: string;
  status?: "Draft" | "Pending Approval" | "Active" | "Inactive";
  locationManagerUserId?: string;
  managerName?: string;
  managerEmail?: string;
  managerPhone?: string;
  fax?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateRegion?: string;
  country?: string;
  postalCode?: string;
  gpsLatitude?: string;
  gpsLongitude?: string;
  geocodedDisplayName?: string;
  geocodedAt?: string;
  geocodingProvider?: string;
  defaultCurrency?: string;
  ownershipOccupationType?: string;
  imageUrl?: string;
  notes?: string;
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
  location?: LocationProfile;
  property?: {
    address?: string;
    propertyManager?: string;
    sizeSqm?: number;
  };
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
  status: "Active" | "Suspended" | "Locked" | "Pending Activation";
  isPlatformAdmin?: boolean;
  tenantId?: string;
  tenantSlug?: string;
  tenantName?: string;
  // Admin-set only (see backend UserRecord/apply_user_record) — displayed
  // read-only on the mobile Profile screen, never edited from here.
  mission?: string;
  department?: string;
  // Set only by QR onboarding's collect_grant (auto-login with a
  // system-generated placeholder password) — see useAuth's session handling
  // and (onboard)/finish.tsx, which is the only screen that clears it via
  // POST /auth/first-password-set.
  mustChangePassword?: boolean;
};

export type TenantSummary = {
  id: string;
  name: string;
  slug: string;
  status: string;
};
