import { NextResponse } from "next/server";

/**
 * Perplexity Chat Completions（OpenAI 兼容）
 * 文档: https://docs.perplexity.ai/api-reference/chat-completions-post
 */
const PPLX_URL = "https://api.perplexity.ai/chat/completions";

const DEFAULT_MODEL = "sonar";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      apiKey?: string;
      query?: string;
      model?: string;
    };
    const apiKey = body.apiKey?.trim();
    const query = body.query?.trim();
    const model = body.model?.trim() || DEFAULT_MODEL;

    if (!apiKey || !query) {
      return NextResponse.json(
        { ok: false, error: "缺少 apiKey 或 query", code: "BAD_REQUEST" },
        { status: 400 }
      );
    }

    const upstream = await fetch(PPLX_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: query }],
        max_tokens: 2048,
        temperature: 0.2,
      }),
    });

    const rawText = await upstream.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText) as unknown;
    } catch {
      parsed = null;
    }

    if (!upstream.ok) {
      const errObj =
        parsed && typeof parsed === "object"
          ? (parsed as { error?: { message?: string } })
          : null;
      const msg = errObj?.error?.message || rawText || `HTTP ${upstream.status}`;
      let friendly = msg;
      if (upstream.status === 401) friendly = "Perplexity API Key 无效";
      else if (upstream.status === 429)
        friendly = "Perplexity 额度或速率限制（请稍后重试）";
      else if (upstream.status === 400 && /model/i.test(msg))
        friendly = `模型不可用：${model}。请在 README 中更换为账户支持的模型。`;

      return NextResponse.json(
        {
          ok: false,
          error: friendly,
          code: `HTTP_${upstream.status}`,
        },
        { status: 200 }
      );
    }

    const choices =
      parsed &&
      typeof parsed === "object" &&
      "choices" in parsed &&
      Array.isArray((parsed as { choices: unknown }).choices)
        ? (parsed as { choices: Array<{ message?: { content?: string } }> })
            .choices
        : null;
    const text =
      choices?.[0]?.message?.content?.trim() ||
      (typeof rawText === "string" ? rawText : "");

    if (!text) {
      return NextResponse.json(
        {
          ok: false,
          error: "Perplexity 返回内容为空",
          code: "EMPTY",
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ ok: true, text });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Perplexity 代理异常";
    return NextResponse.json(
      { ok: false, error: message, code: "PROXY_ERROR" },
      { status: 200 }
    );
  }
}
