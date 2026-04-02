import { NextResponse } from "next/server";
import { metasoChatCompletions } from "@/lib/metaso/metaso-chat";
import {
  flattenMetasoPayload,
  metasoBodyToText,
  metasoBusinessFailureMessage,
} from "@/lib/metaso/search-parse";

/**
 * 与 MCP 工具 metaso_web_search 对齐：POST /api/v1/search
 * （参数 q、scope、includeSummary、includeRawContent、size）
 *
 * 正文过短时回退 metaso_chat：POST /api/v1/chat/completions（model=fast）
 * 与 csrts/metaso-mcp 使用的 REST 一致。
 */
const METASO_SEARCH_URL = "https://metaso.cn/api/v1/search";

const MIN_TEXT_CHARS = 24;

function buildWebSearchBody(query: string): Record<string, unknown> {
  const includeRaw =
    process.env.METASO_INCLUDE_RAW_CONTENT === "true" ||
    process.env.NEXT_PUBLIC_METASO_INCLUDE_RAW === "true";

  return {
    q: query,
    scope: "webpage",
    includeSummary: true,
    includeRawContent: includeRaw,
    size: 10,
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      apiKey?: string;
      query?: string;
    };
    const apiKey = body.apiKey?.trim();
    const query = body.query?.trim();
    if (!apiKey || !query) {
      return NextResponse.json(
        { ok: false, error: "缺少 apiKey 或 query", code: "BAD_REQUEST" },
        { status: 400 }
      );
    }

    const upstream = await fetch(METASO_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(buildWebSearchBody(query)),
    });

    const rawText = await upstream.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText) as unknown;
    } catch {
      parsed = rawText;
    }

    if (!upstream.ok) {
      const msg =
        (parsed &&
          typeof parsed === "object" &&
          (parsed as { message?: string }).message) ||
        rawText ||
        `Metaso HTTP ${upstream.status}`;
      return NextResponse.json(
        {
          ok: false,
          error:
            upstream.status === 401 || upstream.status === 403
              ? "Metaso API Key 无效或无权限"
              : upstream.status === 429
                ? "Metaso 请求过于频繁或额度不足"
                : msg,
          code: `HTTP_${upstream.status}`,
        },
        { status: 200 }
      );
    }

    if (parsed && typeof parsed === "object") {
      const flat = flattenMetasoPayload(parsed);
      const bizErr = metasoBusinessFailureMessage(flat);
      if (bizErr) {
        return NextResponse.json(
          {
            ok: false,
            error: `Metaso：${bizErr}`,
            code: "METASO_BUSINESS",
          },
          { status: 200 }
        );
      }
    }

    let text = metasoBodyToText(parsed).trim();
    let usedChatFallback = false;

    if (text.length < MIN_TEXT_CHARS) {
      const chatText = await metasoChatCompletions(apiKey, query);
      if (chatText && chatText.trim().length >= MIN_TEXT_CHARS) {
        text = `[metaso_chat 补充检索]\n\n${chatText.trim()}`;
        usedChatFallback = true;
      }
    }

    if (text.length < MIN_TEXT_CHARS) {
      return NextResponse.json(
        {
          ok: false,
          error: `Metaso 未生成足够可供 Gemini 解析的正文（检索与 metaso_chat 回退均不足 ${MIN_TEXT_CHARS} 字）。${usedChatFallback ? "已尝试 chat 回退。" : ""}可在服务端环境变量设置 METASO_INCLUDE_RAW_CONTENT=true 以开启 includeRawContent；或在浏览器 Network 查看本接口返回的上游 JSON。`,
          code: "METASO_EMPTY",
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      ok: true,
      text,
      meta: { usedChatFallback },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Metaso 代理异常";
    return NextResponse.json(
      { ok: false, error: message, code: "PROXY_ERROR" },
      { status: 200 }
    );
  }
}
