"use client";

import * as React from "react";
import type { ApiKeys } from "@/lib/types";
import { getApiKeys, setApiKeys as persistKeys } from "@/lib/storage";

export function useApiKeys() {
  const [keys, setKeysState] = React.useState<ApiKeys>(() => getApiKeys());

  const setKeys = React.useCallback((next: ApiKeys) => {
    persistKeys(next);
    setKeysState(next);
  }, []);

  const refresh = React.useCallback(() => {
    setKeysState(getApiKeys());
  }, []);

  return { keys, setKeys, refresh };
}
