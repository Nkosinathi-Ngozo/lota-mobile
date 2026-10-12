import { useEffect, useState } from "react";

// Delays reflecting a fast-changing value (typically a search query) until
// it stops changing for `delayMs` — used ahead of network search calls so
// admin tenant/user/audit lists don't issue a request per keystroke (see
// Priority 7/8 of MOBILE_UI_UX_PRODUCTION_READINESS.md).
export function useDebouncedValue<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
}
