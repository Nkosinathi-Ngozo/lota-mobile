import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { loginApi, logoutApi, readAuthSession, subscribeToAuthChanges } from "@/lib/api";
import type { AppUser } from "@/types/domain";

type AuthContextValue = {
  currentUser: AppUser | null;
  isReady: boolean;
  login: (username: string, password: string, tenantSlug?: string) => Promise<{ ok: boolean; message: string }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  const refresh = useCallback(async () => {
    const session = await readAuthSession();
    setCurrentUser(session?.user?.status === "Active" ? session.user : null);
    setIsReady(true);
  }, []);

  useEffect(() => {
    void refresh();
    const unsubscribe = subscribeToAuthChanges(() => void refresh());
    return () => unsubscribe();
  }, [refresh]);

  const login = useCallback(async (username: string, password: string, tenantSlug?: string) => {
    try {
      const session = await loginApi(username, password, tenantSlug);
      setCurrentUser(session.user);
      setIsReady(true);
      return { ok: true, message: "Signed in." };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid username or password.";
      return { ok: false, message };
    }
  }, []);

  const logout = useCallback(async () => {
    await logoutApi();
    setCurrentUser(null);
  }, []);

  const value = useMemo(() => ({ currentUser, isReady, login, logout }), [currentUser, isReady, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
