/**
 * 对应 MCP 工具 metaso_chat：秘塔 RAG 问答（与 csrts/metaso-mcp 一致走 REST）。
 * 文档基址: https://metaso.cn
 */
const METASO_CHAT_COMPLETIONS_URL =
  "https://metaso.cn/api/v1/chat/completions";

export async function metasoChatCompletions(
  apiKey: string,
  userContent: string
): Promise<string | null> {
  const res = await fetch(METASO_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "fast",
      stream: false,
      messages: [{ role: "user", content: userContent }],
    }),
  });

  const raw = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }

  if (!res.ok) return null;

  const o = data as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string } | string;
  };

  if (o.error) {
    return null;
  }

  const text = o.choices?.[0]?.message?.content?.trim();
  return text && text.length > 0 ? text : null;
}
