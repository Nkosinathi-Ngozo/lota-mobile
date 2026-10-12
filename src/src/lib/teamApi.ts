// Tenant-scoped team management — thin client for the backend's /users/*
// endpoints (b/lota/src/app/api/v1/users.py). Every write here is
// server-side gated by _ensure_admin (role must be Admin or International
// Admin); this file is only ever reached from mobile screens already gated
// the same way (see (app)/_layout.tsx's canManageTeam check).
import { apiRequest } from "@/lib/api";
import type { OnboardingGrantRecord } from "@/lib/adminApi";
import type { AppUser } from "@/types/domain";

export const teamApi = {
  list: () => apiRequest<AppUser[]>("/users"),

  resendInvite: (userId: string) => apiRequest<{ ok: boolean }>(`/users/${userId}/resend-invite`, { method: "POST" }),
};

export const orgMemberOnboardingApi = {
  create: (payload: { email: string; displayName?: string; role: string }) =>
    apiRequest<OnboardingGrantRecord>("/users/onboarding-grants", { method: "POST", body: payload }),

  get: (grantId: string) => apiRequest<OnboardingGrantRecord>(`/users/onboarding-grants/${grantId}`),

  reopen: (grantId: string) => apiRequest<OnboardingGrantRecord>(`/users/onboarding-grants/${grantId}/reopen`, { method: "POST" }),

  approve: (grantId: string) => apiRequest<OnboardingGrantRecord>(`/users/onboarding-grants/${grantId}/approve`, { method: "POST" }),

  reject: (grantId: string, reason: string) =>
    apiRequest<OnboardingGrantRecord>(`/users/onboarding-grants/${grantId}/reject`, { method: "POST", body: { reason } }),
};
