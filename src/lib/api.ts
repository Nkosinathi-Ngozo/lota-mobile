// Mirrors f/lota/src/lib/api.ts's auth/session/request contract so the
// mobile app talks to the exact same backend with the exact same shapes.
// localStorage/sessionStorage -> AsyncStorage; window events -> a tiny
// pub/sub so useAuth can react to session changes from anywhere.

import Constants from "expo-constants";

import { getSecureJson, removeSecure, setSecureJson } from "@/lib/secureStorage";
import { getJson, remove } from "@/lib/storage";
import type { AppUser, AssetRecord, TenantSummary } from "@/types/domain";

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? Constants.expoConfig?.extra?.apiBaseUrl ?? "http://localhost:8000/api/v1").replace(/\/+$/, "");
const AUTH_KEY = "asset-universe.auth.v1";

export type AuthSession = {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt: number;
  user: AppUser;
  tenant?: TenantSummary | null;
};

type ApiOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  auth?: boolean;
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type Listener = () => void;
const listeners = new Set<Listener>();
function emitAuthChange() {
  listeners.forEach((listener) => listener());
}

export function subscribeToAuthChanges(callback: Listener) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

let cachedSession: AuthSession | null | undefined;

export async function readAuthSession(): Promise<AuthSession | null> {
  if (cachedSession !== undefined) return cachedSession;
  let session = await getSecureJson<AuthSession>(AUTH_KEY);
  if (!session) {
    // One-time migration: earlier builds stored the session in AsyncStorage
    // (unencrypted). Pick it up from there once, move it into SecureStore,
    // and wipe the plaintext copy — so upgrading doesn't silently log
    // everyone out, but the token also doesn't linger unencrypted on disk.
    const legacy = await getJson<AuthSession>(AUTH_KEY);
    if (legacy) {
      await setSecureJson(AUTH_KEY, legacy);
      await remove(AUTH_KEY);
      session = legacy;
    }
  }
  cachedSession = session;
  return session;
}

export async function writeAuthSession(session: AuthSession | null) {
  cachedSession = session;
  if (session) await setSecureJson(AUTH_KEY, session);
  else await removeSecure(AUTH_KEY);
  emitAuthChange();
}

export function apiBaseUrl() {
  return API_BASE_URL;
}

let refreshPromise: Promise<AuthSession | null> | null = null;

export async function apiRequest<T>(path: string, options: ApiOptions = {}, retry = true): Promise<T> {
  const session = await readAuthSession();
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (options.auth !== false && session?.accessToken) headers.set("Authorization", `Bearer ${session.accessToken}`);
  if (session?.tenant?.slug) headers.set("X-Tenant-Slug", session.tenant.slug);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      body: options.body instanceof FormData ? options.body : options.body == null ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError(0, "Could not reach the server. Check your connection and try again.");
  }

  if (response.status === 401 && retry && options.auth !== false && session?.refreshToken) {
    const refreshed = await refreshAuthSession();
    if (refreshed) return apiRequest<T>(path, options, false);
  }

  if (!response.ok) {
    let message = response.statusText || "Request failed";
    try {
      const body = await response.json();
      message = body?.error?.message || body?.detail || message;
    } catch {
      // keep status text
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function loginApi(username: string, password: string, tenantSlug?: string) {
  const response = await apiRequest<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: AppUser;
    tenant?: TenantSummary | null;
  }>("/auth/login", {
    method: "POST",
    auth: false,
    headers: tenantSlug ? { "X-Tenant-Slug": tenantSlug } : undefined,
    body: { username, password },
  });
  const session: AuthSession = {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    expiresAt: Date.now() + response.expiresIn * 1000,
    user: response.user,
    tenant: response.tenant ?? null,
  };
  await writeAuthSession(session);
  return session;
}

export async function logoutApi() {
  const session = await readAuthSession();
  try {
    await apiRequest("/auth/logout", { method: "POST", body: { refreshToken: session?.refreshToken } });
  } catch {
    // local logout should still happen if the server is unavailable
  } finally {
    await writeAuthSession(null);
  }
}

export async function refreshAuthSession() {
  if (refreshPromise) return refreshPromise;
  const session = await readAuthSession();
  if (!session?.refreshToken) return null;

  refreshPromise = apiRequest<{ accessToken: string; refreshToken: string; expiresIn: number; user: AppUser }>("/auth/refresh", {
    method: "POST",
    auth: false,
    body: { refreshToken: session.refreshToken },
  })
    .then(async (response) => {
      const next: AuthSession = {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        expiresAt: Date.now() + response.expiresIn * 1000,
        user: response.user,
        tenant: session.tenant,
      };
      await writeAuthSession(next);
      return next;
    })
    .catch(async () => {
      await writeAuthSession(null);
      return null;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

export async function loadCurrentUser() {
  return apiRequest<AppUser>("/auth/me");
}

export const assetsApi = {
  list: () => apiRequest<AssetRecord[]>("/assets"),
  get: (uid: string) => apiRequest<AssetRecord>(`/assets/${encodeURIComponent(uid)}`),
  update: (uid: string, asset: AssetRecord) => apiRequest<AssetRecord>(`/assets/${encodeURIComponent(uid)}`, { method: "PUT", body: asset }),
};

export const codesApi = {
  validate: (value: string) =>
    apiRequest<{ valid: boolean; entityType?: string; entityUid?: string; entity?: AssetRecord; reason?: string }>("/codes/validate", {
      method: "POST",
      body: { value },
    }),
};

export async function uploadImageApi(file: { uri: string; name: string; type: string }) {
  const body = new FormData();
  // React Native FormData accepts this shape directly; the DOM File type
  // doesn't model it, hence the cast.
  body.append("file", { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
  const response = await apiRequest<{ success: boolean; filePath?: string; file_path?: string }>("/upload/images", {
    method: "POST",
    body,
  });
  return response.filePath ?? response.file_path ?? null;
}
