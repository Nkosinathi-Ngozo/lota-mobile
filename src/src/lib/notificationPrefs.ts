import { useCallback, useEffect, useState } from "react";

import { getJson, setJson } from "@/lib/storage";

// Device-local only. Push delivery exists now (see hooks/usePushRegistration.ts
// and the backend's /push-tokens), but the server sends every notification a
// user is in the audience for: these toggles are stored on this device and do
// not yet filter what is delivered. Persisting them server-side (PATCH
// /auth/me's profile JSONB is the likely home) is what would make them bite.
export type NotificationPrefs = {
  verificationDue: boolean;
  syncFailures: boolean;
  accountActivity: boolean;
};

const NOTIFICATION_PREFS_KEY = "lota.mobile-notification-prefs.v1";

const DEFAULT_PREFS: NotificationPrefs = {
  verificationDue: true,
  syncFailures: true,
  accountActivity: true,
};

export function useNotificationPrefs() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    getJson<NotificationPrefs>(NOTIFICATION_PREFS_KEY).then((stored) => {
      if (stored) setPrefs({ ...DEFAULT_PREFS, ...stored });
      setIsReady(true);
    });
  }, []);

  const setPref = useCallback((key: keyof NotificationPrefs, value: boolean) => {
    setPrefs((current) => {
      const next = { ...current, [key]: value };
      void setJson(NOTIFICATION_PREFS_KEY, next);
      return next;
    });
  }, []);

  return { prefs, isReady, setPref };
}
