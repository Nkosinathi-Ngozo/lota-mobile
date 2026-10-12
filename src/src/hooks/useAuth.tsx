import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  clearPreImpersonationSession,
  loadCurrentUser,
  loginApi,
  logoutApi,
  readAuthSession,
  readPreImpersonationSession,
  stashPreImpersonationSession,
  subscribeToAuthChanges,
  writeAuthSession,
} from "@/lib/api";
import { enterTenantApi, returnToSuperAdminApi } from "@/lib/adminApi";
import { isBiometricUnlockEnabled, setBiometricUnlockEnabled } from "@/lib/biometrics";
import { unregisterDevicePushToken } from "@/lib/pushToken";
import type { AppUser, TenantSummary } from "@/types/domain";

type AuthContextValue = {
  currentUser: AppUser | null;
  isReady: boolean;
  isImpersonating: boolean;
  impersonatedTenantName: string | null;
  // True only right after QR onboarding's auto-login (collect_grant) — the
  // app must route straight into the forced password-change screen before
  // anywhere else, the same way isImpersonating gates the admin console.
  mustChangePassword: boolean;
  // True for exactly one moment per cold app start: a stored session exists
  // AND biometric unlock is enabled on this device. app/index.tsx checks
  // this ahead of every other redirect and shows the unlock screen instead —
  // unlock() (biometric success) or logout() (fall back to password) are
  // the only ways out. Never re-set true again after the first check this
  // process run, so it can't re-lock mid-session (e.g. after a background
  // PATCH /auth/me triggers refresh()).
  locked: boolean;
  unlock: () => void;
  login: (username: string, password: string, tenantSlug?: string) => Promise<{ ok: boolean; message: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<AppUser | null>;
  enterTenant: (tenantId: string, reason: string) => Promise<{ ok: boolean; message: string }>;
  returnToSuperAdmin: () => Promise<{ ok: boolean; message: string }>;
  // Writes the session onboardingApi.collect returns (see (onboard)/finish.tsx)
  // and clears it again once POST /auth/first-password-set succeeds.
  adoptOnboardedSession: (session: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: AppUser;
    tenant: TenantSummary;
  }) => Promise<void>;
  clearMustChangePassword: (user: AppUser) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedTenantName, setImpersonatedTenantName] = useState<string | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [locked, setLocked] = useState(false);
  const checkedLockRef = useRef(false);

  const refresh = useCallback(async () => {
    const session = await readAuthSession();
    setCurrentUser(session?.user?.status === "Active" ? session.user : null);
    setIsImpersonating(Boolean(session?.impersonating));
    setImpersonatedTenantName(session?.impersonating ? session?.tenant?.name ?? null : null);
    setMustChangePassword(Boolean(session?.user?.mustChangePassword));

    // Only ever decided once per cold start (checkedLockRef), the first
    // time a stored session is seen — every later refresh() (profile edit,
    // token refresh, entering/leaving impersonation) must never re-lock an
    // already-unlocked session.
    if (!checkedLockRef.current) {
      checkedLockRef.current = true;
      if (session?.user?.status === "Active") {
        setLocked(await isBiometricUnlockEnabled());
      }
    }

    setIsReady(true);
  }, []);

  useEffect(() => {
    void refresh();
    const unsubscribe = subscribeToAuthChanges(() => void refresh());
    return () => unsubscribe();
  }, [refresh]);

  const unlock = useCallback(() => setLocked(false), []);

  const login = useCallback(async (username: string, password: string, tenantSlug?: string) => {
    try {
      const session = await loginApi(username, password, tenantSlug);
      setCurrentUser(session.user);
      setIsReady(true);
      // A fresh password sign-in is never locked, regardless of whether
      // biometric unlock is enabled from a previous session on this device.
      checkedLockRef.current = true;
      setLocked(false);
      return { ok: true, message: "Signed in." };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid username or password.";
      return { ok: false, message };
    }
  }, []);

  const logout = useCallback(async () => {
    // While the session is still valid: afterwards the request has no auth,
    // and a stale token would keep delivering this user's pushes to a device
    // someone else may sign in on.
    await unregisterDevicePushToken();
    await logoutApi();
    // Device-scoped, not account-scoped (see biometrics.ts) — cleared here
    // so a different person signing in later on a shared/kiosk device
    // never inherits a biometric-unlock gate enrolled for someone else's
    // face/fingerprint, and isn't silently skipped past the enable-prompt.
    await setBiometricUnlockEnabled(false);
    setCurrentUser(null);
    setLocked(false);
  }, []);

  // Re-fetches the current user (e.g. after PATCH /auth/me) and persists it
  // into the stored session, so every screen reading currentUser via
  // subscribeToAuthChanges picks up the change immediately.
  const refreshUser = useCallback(async () => {
    const session = await readAuthSession();
    if (!session) return null;
    const user = await loadCurrentUser();
    await writeAuthSession({ ...session, user });
    return user;
  }, []);

  // Swaps the super admin's session for a short-lived, no-refresh-token
  // tenant session. The pre-impersonation session is stashed in SecureStore
  // (not just a JS variable) so it survives the app being killed or
  // backgrounded while impersonating — otherwise a lost session here would
  // strand the admin logged in as the tenant with no way back.
  const enterTenant = useCallback(async (tenantId: string, reason: string) => {
    const current = await readAuthSession();
    if (!current) return { ok: false, message: "You must be signed in." };
    try {
      const response = await enterTenantApi(tenantId, reason);
      await stashPreImpersonationSession(current);
      await writeAuthSession({
        accessToken: response.accessToken,
        refreshToken: null,
        expiresAt: Date.now() + response.expiresIn * 1000,
        user: response.user as unknown as AppUser,
        tenant: response.tenant,
        impersonating: true,
      });
      return { ok: true, message: `Entered ${response.tenant.name}.` };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not enter tenant.";
      return { ok: false, message };
    }
  }, []);

  const returnToSuperAdmin = useCallback(async () => {
    try {
      const response = await returnToSuperAdminApi();
      await writeAuthSession({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        expiresAt: Date.now() + response.expiresIn * 1000,
        user: response.user,
        tenant: response.tenant ?? null,
        impersonating: false,
      });
      await clearPreImpersonationSession();
      return { ok: true, message: "Returned to Super Admin." };
    } catch (error) {
      // The impersonation token may have already expired server-side —
      // fall back to the stashed pre-impersonation session rather than
      // leaving the admin stuck on a dead token with no way out.
      const stashed = await readPreImpersonationSession();
      if (stashed) {
        await writeAuthSession(stashed);
        await clearPreImpersonationSession();
        return { ok: true, message: "Returned to Super Admin." };
      }
      const message = error instanceof Error ? error.message : "Could not return to Super Admin.";
      return { ok: false, message };
    }
  }, []);

  const adoptOnboardedSession = useCallback(
    async (session: { accessToken: string; refreshToken: string; expiresIn: number; user: AppUser; tenant: TenantSummary }) => {
      await writeAuthSession({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        expiresAt: Date.now() + session.expiresIn * 1000,
        user: session.user,
        tenant: session.tenant,
      });
    },
    [],
  );

  const clearMustChangePassword = useCallback(async (user: AppUser) => {
    const session = await readAuthSession();
    if (!session) return;
    await writeAuthSession({ ...session, user: { ...user, mustChangePassword: false } });
  }, []);

  const value = useMemo(
    () => ({
      currentUser,
      isReady,
      isImpersonating,
      impersonatedTenantName,
      mustChangePassword,
      locked,
      unlock,
      login,
      logout,
      refreshUser,
      enterTenant,
      returnToSuperAdmin,
      adoptOnboardedSession,
      clearMustChangePassword,
    }),
    [
      currentUser,
      isReady,
      isImpersonating,
      impersonatedTenantName,
      mustChangePassword,
      locked,
      unlock,
      login,
      logout,
      refreshUser,
      enterTenant,
      returnToSuperAdmin,
      adoptOnboardedSession,
      clearMustChangePassword,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
