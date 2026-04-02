"use client";

import * as React from "react";
import type { SavedTagGroup } from "@/lib/types";
import {
  addSavedTagGroup,
  getSavedTagGroups,
  removeSavedTagGroup,
} from "@/lib/storage";

export function useSavedTagGroups() {
  const [groups, setGroups] = React.useState<SavedTagGroup[]>([]);

  const refresh = React.useCallback(() => {
    setGroups(getSavedTagGroups());
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const save = React.useCallback(
    (tags: string[]) => {
      const r = addSavedTagGroup(tags);
      if (r.ok) refresh();
      return r;
    },
    [refresh]
  );

  const remove = React.useCallback(
    (id: string) => {
      removeSavedTagGroup(id);
      refresh();
    },
    [refresh]
  );

  return { groups, save, remove, refresh };
}
