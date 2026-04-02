"use client";

import * as React from "react";
import type { Region } from "@/lib/types";
import { getRegion, setRegion as persistRegion } from "@/lib/storage";

export function useRegion() {
  const [region, setRegionState] = React.useState<Region>(() => getRegion());

  const setRegion = React.useCallback((next: Region) => {
    persistRegion(next);
    setRegionState(next);
  }, []);

  React.useEffect(() => {
    setRegionState(getRegion());
  }, []);

  return { region, setRegion };
}
