/**
 * 解析 Metaso /api/v1/search 响应（兼容 webpages、results、嵌套 data 等）。
 */

export function pickString(...vals: unknown[]): string | undefined {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

export function flattenMetasoPayload(parsed: unknown): Record<string, unknown> {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {};
  }
  const o = parsed as Record<string, unknown>;
  const out: Record<string, unknown> = { ...o };
  for (const key of ["data", "result", "payload"] as const) {
    const inner = o[key];
    if (inner && typeof inner === "object" && !Array.isArray(inner)) {
      Object.assign(out, inner as Record<string, unknown>);
    }
  }
  return out;
}

export function findWebpageList(o: Record<string, unknown>): unknown[] {
  const candidates = [
    o.webpages,
    o.results,
    o.items,
    o.list,
    o.documents,
    o.records,
  ];
  for (const c of candidates) {
    if (Array.isArray(c) && c.length > 0) return c;
  }
  return [];
}

export function itemTextParts(p: Record<string, unknown>): {
  title: string;
  body: string;
  link: string;
} {
  const title = String(
    p.title ?? p.name ?? p.headline ?? p.topic ?? ""
  ).trim();
  const body = String(
    p.snippet ??
      p.summary ??
      p.abstract ??
      p.description ??
      p.content ??
      p.text ??
      ""
  ).trim();
  const link = String(p.link ?? p.url ?? "").trim();
  return { title, body, link };
}

export function metasoBusinessFailureMessage(
  flat: Record<string, unknown>
): string | null {
  const errno = flat.errno;
  if (typeof errno === "number") {
    if (errno !== 0 && errno !== 200) {
      return (
        pickString(flat.message, flat.msg, flat.errorMessage) ??
        (typeof flat.error === "string" ? flat.error.trim() : undefined) ??
        `Metaso 返回 errno ${errno}`
      );
    }
  }

  const code = flat.code;
  if (typeof code === "number") {
    if (code !== 0 && code !== 200) {
      return (
        pickString(flat.message, flat.msg, flat.errorMessage) ??
        (typeof flat.error === "string" ? flat.error.trim() : undefined) ??
        `Metaso 返回错误码 ${code}`
      );
    }
  }
  if (typeof code === "string") {
    const c = code.trim().toLowerCase();
    if (c && c !== "0" && c !== "200" && c !== "success") {
      const msg = pickString(flat.message, flat.msg, flat.error);
      if (msg) return msg;
    }
  }
  if (flat.success === false) {
    return (
      pickString(flat.message, flat.msg, flat.errorMessage) ??
      (typeof flat.error === "string" ? flat.error : undefined) ??
      "Metaso 请求未成功"
    );
  }
  if (typeof flat.error === "string" && flat.error.trim()) {
    return flat.error.trim();
  }
  return null;
}

export function metasoBodyToText(data: unknown): string {
  if (typeof data === "string") return data;
  if (!data || typeof data !== "object") return JSON.stringify(data);

  const flat = flattenMetasoPayload(data);

  const summary =
    typeof flat.summary === "string" ? flat.summary.trim() : "";
  if (summary.length > 0) return summary;

  const answer = typeof flat.answer === "string" ? flat.answer.trim() : "";
  if (answer.length > 0) return answer;

  const content =
    typeof flat.content === "string" ? flat.content.trim() : "";
  if (content.length > 0) return content;

  const webpages = findWebpageList(flat);
  if (webpages.length > 0) {
    return webpages
      .map((w, i) => {
        if (!w || typeof w !== "object") return "";
        const p = w as Record<string, unknown>;
        const { title, body, link } = itemTextParts(p);
        const date = String(p.date ?? p.time ?? "").trim();
        return `${i + 1}. ${title}\n时间: ${date}\n摘要: ${body}\n链接: ${link}\n`;
      })
      .filter(Boolean)
      .join("\n");
  }

  if (typeof flat.message === "string" && flat.message.trim()) {
    return flat.message.trim();
  }

  return JSON.stringify(flat, null, 2);
}

export function hasUsableWebResults(flat: Record<string, unknown>): boolean {
  const list = findWebpageList(flat);
  if (list.length === 0) return false;
  return list.some((w) => {
    if (!w || typeof w !== "object") return false;
    const { title, body, link } = itemTextParts(w as Record<string, unknown>);
    return title.length > 0 || body.length > 0 || link.length > 0;
  });
}
