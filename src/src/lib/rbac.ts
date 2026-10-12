// Mirrors f/lota/src/lib/rbac.ts's TENANT_ADMIN_ROLES/canManageUsers — kept
// in one place so "who can manage this tenant's users" can never mean
// something different between the web and mobile apps, or between the
// mobile UI (this file) and the backend's actual enforcement
// (b/lota/src/app/api/v1/users.py's _ensure_admin, which is the real gate;
// this is only for deciding what the mobile app shows).
import type { AppUser } from "@/types/domain";

export const TENANT_ADMIN_ROLES = ["Admin", "International Admin"];

export function canManageTeam(user: AppUser | null | undefined): boolean {
  return Boolean(user) && !user!.isPlatformAdmin && TENANT_ADMIN_ROLES.includes(user!.role) && user!.status === "Active";
}
