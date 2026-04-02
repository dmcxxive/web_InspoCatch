import type { ApiKeys, BackpackItem, Region, SavedTagGroup } from "@/lib/types";

const KEYS_STORE = "inspocatch_api_keys";
const REGION_STORE = "inspocatch_region";
const BACKPACK_STORE = "inspocatch_backpack";
const TAG_GROUPS_STORE = "inspocatch_saved_tag_groups";
export const MAX_SAVED_TAG_GROUPS = 5;

const DEFAULT_KEYS: ApiKeys = {
  contentAiProvider: "gemini",
  gemini: "",
  zhipu: "",
  metaso: "",
  perplexity: "",
};

function defaultRegionFromEnv(): Region {
  const v = process.env.NEXT_PUBLIC_DEFAULT_REGION?.toLowerCase();
  if (v === "jp") return "jp";
  return "cn";
}

export function getApiKeys(): ApiKeys {
  if (typeof window === "undefined") return DEFAULT_KEYS;
  try {
    const raw = localStorage.getItem(KEYS_STORE);
    if (!raw) return DEFAULT_KEYS;
    const parsed = JSON.parse(raw) as Partial<ApiKeys>;
    return {
      contentAiProvider:
        parsed.contentAiProvider === "zhipu" ? "zhipu" : "gemini",
      gemini: typeof parsed.gemini === "string" ? parsed.gemini : "",
      zhipu: typeof parsed.zhipu === "string" ? parsed.zhipu : "",
      metaso: typeof parsed.metaso === "string" ? parsed.metaso : "",
      perplexity:
        typeof parsed.perplexity === "string" ? parsed.perplexity : "",
    };
  } catch {
    return DEFAULT_KEYS;
  }
}

export function setApiKeys(keys: ApiKeys): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS_STORE, JSON.stringify(keys));
}

export function getRegion(): Region {
  if (typeof window === "undefined") return defaultRegionFromEnv();
  try {
    const raw = localStorage.getItem(REGION_STORE);
    if (raw === "cn" || raw === "jp") return raw;
    return defaultRegionFromEnv();
  } catch {
    return defaultRegionFromEnv();
  }
}

export function setRegion(region: Region): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(REGION_STORE, region);
}

export function getBackpack(): BackpackItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(BACKPACK_STORE);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter(isBackpackItem);
  } catch {
    return [];
  }
}

function isBackpackItem(x: unknown): x is BackpackItem {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (o.tags !== undefined) {
    if (!Array.isArray(o.tags) || !o.tags.every((t) => typeof t === "string")) {
      return false;
    }
  }
  return (
    typeof o.id === "string" &&
    (o.region === "cn" || o.region === "jp") &&
    typeof o.finalPrompt === "string" &&
    typeof o.createdAt === "string" &&
    typeof o.published === "boolean"
  );
}

export function setBackpack(items: BackpackItem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(BACKPACK_STORE, JSON.stringify(items));
}

export function addBackpackItem(item: BackpackItem): void {
  const items = getBackpack();
  setBackpack([item, ...items]);
}

export function updateBackpackItem(
  id: string,
  patch: Partial<Pick<BackpackItem, "published">>
): void {
  const items = getBackpack().map((it) =>
    it.id === id ? { ...it, ...patch } : it
  );
  setBackpack(items);
}

function isSavedTagGroup(x: unknown): x is SavedTagGroup {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    Array.isArray(o.tags) &&
    o.tags.every((t) => typeof t === "string") &&
    typeof o.createdAt === "string"
  );
}

export function getSavedTagGroups(): SavedTagGroup[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TAG_GROUPS_STORE);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter(isSavedTagGroup).slice(0, MAX_SAVED_TAG_GROUPS);
  } catch {
    return [];
  }
}

export function setSavedTagGroups(groups: SavedTagGroup[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    TAG_GROUPS_STORE,
    JSON.stringify(groups.slice(0, MAX_SAVED_TAG_GROUPS))
  );
}

/** 新增一组到队首；与已有完全相同的 tags 会先移除旧项再插入（刷新顺序）。最多保留 5 组。 */
export function addSavedTagGroup(
  tags: string[]
): { ok: true } | { ok: false; error: string } {
  const normalized = tags.map((t) => t.trim()).filter(Boolean);
  if (normalized.length === 0) {
    return {
      ok: false,
      error: "请先输入标签，或将输入框内的词用空格收为标签后再保存",
    };
  }
  const deduped = getSavedTagGroups().filter(
    (g) => JSON.stringify(g.tags) !== JSON.stringify(normalized)
  );
  const item: SavedTagGroup = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `tg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    tags: normalized,
    createdAt: new Date().toISOString(),
  };
  setSavedTagGroups([item, ...deduped]);
  return { ok: true };
}

export function removeSavedTagGroup(id: string): void {
  setSavedTagGroups(getSavedTagGroups().filter((g) => g.id !== id));
}
