// Platform Super Admin console — thin client for the backend's /admin/*
// endpoints (b/lota/src/app/api/v1/admin.py), all gated server-side by
// require_super_admin. Types mirror the Pydantic response models field for
// field (FastAPI serializes them camelCase as declared, so no snake_case
// translation is needed on the response side — only request query params
// are snake_case, per the backend's FastAPI query-param names).
import { apiRequest } from "@/lib/api";
import type { AppUser, TenantSummary } from "@/types/domain";

function buildQuery(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

export type PlatformSummary = {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  totalUsers: number;
  activeUsers: number;
  totalAssets: number;
};

export type AttentionItem = {
  id: string;
  severity: "critical" | "warning" | "info";
  type: string;
  summary: string;
  tenantId: string | null;
  tenantName: string | null;
  occurredAt: string | null;
  link: string;
};

export type TenantHealthRow = {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  status: string;
  userCount: number;
  assetCount: number;
  lastActivity: string | null;
  healthState: "healthy" | "attention" | "suspended";
};

export type RecentActivityRow = {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  action: string;
  category: string | null;
  actorId: string | null;
  occurredAt: string;
};

export type PlatformOverview = {
  summary: PlatformSummary;
  attention: AttentionItem[];
  tenantHealth: TenantHealthRow[];
  recentActivity: RecentActivityRow[];
  platformStatus: "operational" | "degraded" | "unavailable" | null;
};

export type TenantRecord = {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  userCount: number;
  adminCount: number;
  assetCount: number;
  lastActivity: string | null;
  healthState: "healthy" | "attention" | "suspended";
};

// Mirrors b/lota/src/app/schemas.py's TenantDetailResponse — deliberately
// excludes business data (assets, leases, financials); identity, counts,
// and operational/auth posture only, per the Tenant Operations SDD.
export type TenantAdminSummary = {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: string;
  status: string;
  lastLogin: string | null;
};

export type TenantAuthSummary = {
  activeSessionCount: number;
  lockedUserCount: number;
  usersWithExcessiveFailedLogins: number;
};

export type TenantDetail = TenantRecord & {
  activeUserCount: number;
  administrators: TenantAdminSummary[];
  authSummary: TenantAuthSummary;
  recentActivity: RecentActivityRow[];
};

export type UsersOverview = {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  lockedUsers: number;
  privilegedUsers: number;
  platformAdminCount: number;
};

export type AdminUserRecord = AppUser & {
  password?: string | null;
  createdAt?: string | null;
  failedLoginCount: number;
  lockedAt: string | null;
  lastLogin: string | null;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  tenantIsPlatform: boolean;
};

export type LockedAccountRow = {
  userId: string;
  username: string;
  displayName: string;
  role: string;
  isPlatformAdmin: boolean;
  tenantId: string;
  tenantName: string;
  failedLoginCount: number;
  lockedAt: string | null;
  lastLogin: string | null;
  status: string;
};

export type PrivilegedChangeRow = {
  auditId: string;
  action: string;
  targetUsername: string;
  tenantId: string;
  tenantName: string;
  occurredAt: string;
};

export type ImpersonationActivityRow = {
  sessionId: string;
  platformAdminId: string;
  tenantId: string;
  tenantName: string;
  reason: string | null;
  issuedAt: string;
  expiresAt: string;
  endedAt: string | null;
  revokedAt: string | null;
  ipAddress: string | null;
  userAgent: string | null;
};

export type SecuritySummary = {
  lockedAccountCount: number;
  excessiveFailedLoginCount: number;
  suspendedPrivilegedAccountCount: number;
  privilegedUserCount: number;
  platformAdminCount: number;
  recentImpersonationCount: number;
  recentPrivilegedChangeCount: number;
};

export type SecurityOverview = {
  summary: SecuritySummary;
  attention: AttentionItem[];
  lockedAccounts: LockedAccountRow[];
  privilegedChanges: PrivilegedChangeRow[];
  impersonationActivity: ImpersonationActivityRow[];
};

export type AdminAuditRow = {
  id: string;
  action: string;
  category: string | null;
  actorId: string | null;
  occurredAt: string;
  investigationCategory: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  entry: Record<string, unknown>;
};

export type AuditListResponse = {
  items: AdminAuditRow[];
  total: number;
  hasMore: boolean;
};

export type ImpersonationResponse = {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: Record<string, unknown>;
  tenant: TenantSummary;
  impersonation: true;
};

// Operator-mediated QR onboarding (mobile-only alternative to
// email-invite links) — see b/lota/src/app/services/onboarding.py for the
// full state machine, shared by two kinds:
//   - "tenant_admin": platform Super Admin creates a brand-new tenant
//     (onboardingGrantsApi below, /admin/onboarding-grants).
//   - "org_member": tenant Admin/International Admin invites a teammate
//     into their own tenant (orgMemberOnboardingApi below,
//     /users/onboarding-grants).
export type OnboardingGrantStatus = "pending" | "scanned" | "approved" | "rejected" | "expired" | "collected";
export type OnboardingGrantKind = "tenant_admin" | "org_member";

export type OnboardingGrantRecord = {
  id: string;
  tenantId: string;
  tenantName: string;
  kind: OnboardingGrantKind;
  inviteeEmail: string;
  inviteeRole: string;
  status: OnboardingGrantStatus;
  matchPhrase: string | null;
  scanCount: number;
  scannedAt: string | null;
  scannedIp: string | null;
  scannedUserAgent: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectedReason: string | null;
  createdAt: string;
  expiresAt: string;
  claimExpiresAt: string | null;
  // Only present on create/reopen responses — the signed QR payload to
  // render, never persisted client-side beyond that screen's lifetime.
  qrPayload: string | null;
};

export const onboardingGrantsApi = {
  create: (payload: { tenantName: string; adminEmail: string; adminDisplayName?: string }) =>
    apiRequest<OnboardingGrantRecord>("/admin/onboarding-grants", { method: "POST", body: payload }),

  get: (grantId: string) => apiRequest<OnboardingGrantRecord>(`/admin/onboarding-grants/${grantId}`),

  reopen: (grantId: string) => apiRequest<OnboardingGrantRecord>(`/admin/onboarding-grants/${grantId}/reopen`, { method: "POST" }),

  approve: (grantId: string) => apiRequest<OnboardingGrantRecord>(`/admin/onboarding-grants/${grantId}/approve`, { method: "POST" }),

  reject: (grantId: string, reason: string) =>
    apiRequest<OnboardingGrantRecord>(`/admin/onboarding-grants/${grantId}/reject`, { method: "POST", body: { reason } }),
};

export const superAdminApi = {
  overview: () => apiRequest<PlatformOverview>("/admin/overview"),

  securityOverview: () => apiRequest<SecurityOverview>("/admin/security/overview"),

  listTenants: (params: { status?: string; q?: string } = {}) =>
    apiRequest<TenantRecord[]>(`/admin/tenants${buildQuery({ status_filter: params.status, q: params.q })}`),

  createTenant: (payload: { name: string; initialAdminEmail?: string; initialAdminDisplayName?: string }) =>
    apiRequest<TenantRecord>("/admin/tenants", { method: "POST", body: payload }),

  getTenant: (tenantId: string) => apiRequest<TenantDetail>(`/admin/tenants/${tenantId}`),

  suspendTenant: (tenantId: string) => apiRequest<TenantRecord>(`/admin/tenants/${tenantId}/suspend`, { method: "POST" }),

  reactivateTenant: (tenantId: string) => apiRequest<TenantRecord>(`/admin/tenants/${tenantId}/reactivate`, { method: "POST" }),

  usersOverview: () => apiRequest<UsersOverview>("/admin/users/overview"),

  listUsers: (params: { tenantId?: string; q?: string; status?: string; privilegedOnly?: boolean; includePlatform?: boolean } = {}) =>
    apiRequest<AdminUserRecord[]>(
      `/admin/users${buildQuery({
        tenant_id: params.tenantId,
        q: params.q,
        status_filter: params.status,
        privileged_only: params.privilegedOnly,
        include_platform: params.includePlatform,
      })}`,
    ),

  suspendUser: (userId: string) => apiRequest<AdminUserRecord>(`/admin/users/${userId}/suspend`, { method: "POST" }),

  reactivateUser: (userId: string) => apiRequest<AdminUserRecord>(`/admin/users/${userId}/reactivate`, { method: "POST" }),

  resendInvite: (userId: string) => apiRequest<AdminUserRecord>(`/admin/users/${userId}/resend-invite`, { method: "POST" }),

  listAudit: (
    params: {
      tenantId?: string;
      action?: string;
      category?: string;
      actorId?: string;
      investigationCategory?: string;
      dateFrom?: string;
      dateTo?: string;
      q?: string;
      limit?: number;
      offset?: number;
    } = {},
  ) =>
    apiRequest<AuditListResponse>(
      `/admin/audit${buildQuery({
        tenant_id: params.tenantId,
        action: params.action,
        category: params.category,
        actor_id: params.actorId,
        investigation_category: params.investigationCategory,
        date_from: params.dateFrom,
        date_to: params.dateTo,
        q: params.q,
        limit: params.limit,
        offset: params.offset,
      })}`,
    ),
};

// Impersonation swaps the active session for a tenant session with no
// refresh token — kept out of superAdminApi (mirrors the web app's split
// between superAdminApi and standalone enterAsTenantApi/returnToSuperAdminApi)
// since callers need to stash/restore the pre-impersonation session around
// these two calls rather than just reading the response.
export async function enterTenantApi(tenantId: string, reason: string) {
  return apiRequest<ImpersonationResponse>(`/admin/tenants/${tenantId}/impersonate`, {
    method: "POST",
    body: { reason },
  });
}

export async function returnToSuperAdminApi() {
  return apiRequest<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: AppUser;
    tenant?: TenantSummary | null;
  }>("/admin/return-to-super-admin", { method: "POST" });
}
