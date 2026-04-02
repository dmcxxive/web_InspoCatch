import type { Region } from "@/lib/types";
import {
  metasoSearchQuery,
  perplexitySearchQuery,
} from "@/lib/prompts";

export class SearchProxyError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = "SearchProxyError";
  }
}

export async function searchMetaso(apiKey: string, userTag: string) {
  const query = metasoSearchQuery(userTag);
  const res = await fetch("/api/search/metaso", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey, query }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    text?: string;
    error?: string;
    code?: string;
  };
  if (!res.ok || !data.ok || typeof data.text !== "string") {
    throw new SearchProxyError(
      data.error ?? `Metaso 请求失败（${res.status}）`,
      res.status,
      data.code
    );
  }
  return data.text;
}

export async function searchPerplexity(
  apiKey: string,
  userTag: string,
  model?: string
) {
  const query = perplexitySearchQuery(userTag);
  const res = await fetch("/api/search/perplexity", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey, query, model }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    text?: string;
    error?: string;
    code?: string;
  };
  if (!res.ok || !data.ok || typeof data.text !== "string") {
    throw new SearchProxyError(
      data.error ?? `Perplexity 请求失败（${res.status}）`,
      res.status,
      data.code
    );
  }
  return data.text;
}

export async function searchByRegion(
  region: Region,
  keys: { metaso: string; perplexity: string },
  userTag: string,
  perplexityModel?: string
) {
  if (region === "cn") {
    return searchMetaso(keys.metaso, userTag);
  }
  return searchPerplexity(keys.perplexity, userTag, perplexityModel);
}
