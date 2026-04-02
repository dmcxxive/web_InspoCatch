import type { PersonaOption, StanceOption, TopicCard } from "@/lib/types";
import {
  FINAL_PROMPT_SYSTEM,
  PERSONA_SYSTEM,
  STANCE_SYSTEM,
  WRITING_VOICE_GUIDELINES,
  finalPromptUserPayload,
  personaUserPrompt,
  stanceUserPayload,
  structureExtractUserPrompt,
  STRUCTURE_EXTRACT_SYSTEM,
} from "@/lib/prompts";
import { assertSearchRawTextUsable, GeminiError } from "@/lib/ai/gemini-client";

const ZHIPU_CHAT_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";

function getZhipuModel(): string {
  if (
    typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_ZHIPU_MODEL?.trim()
  ) {
    return process.env.NEXT_PUBLIC_ZHIPU_MODEL.trim();
  }
  return "glm-4-flash";
}

function stripJsonFence(text: string): string {
  let s = text.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  }
  return s.trim();
}

function mapZhipuHttpError(status: number, body: string): GeminiError {
  let msg = body.slice(0, 600);
  try {
    const j = JSON.parse(body) as { error?: { message?: string } };
    if (j.error?.message) msg = j.error.message;
  } catch {
    /* keep slice */
  }
  if (status === 401 || /401|invalid.*key|鉴权|token/i.test(msg)) {
    return new GeminiError("智谱 API Key 无效或已过期", "AUTH");
  }
  if (status === 429 || /quota|限流|额度/i.test(msg)) {
    return new GeminiError("智谱 API 额度或速率受限，请稍后重试", "QUOTA");
  }
  return new GeminiError(`智谱 API 错误（${status}）：${msg}`, "ZHIPU_HTTP");
}

async function zhipuChat(
  apiKey: string,
  opts: {
    system?: string;
    user: string;
    json?: boolean;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  const messages: { role: string; content: string }[] = [];
  if (opts.system) messages.push({ role: "system", content: opts.system });
  messages.push({ role: "user", content: opts.user });

  const body: Record<string, unknown> = {
    model: getZhipuModel(),
    messages,
    temperature: opts.temperature ?? (opts.json ? 0.2 : 0.5),
  };
  if (opts.maxTokens != null) body.max_tokens = opts.maxTokens;
  if (opts.json) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(ZHIPU_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const rawText = await res.text();
  if (!res.ok) {
    throw mapZhipuHttpError(res.status, rawText);
  }

  let data: { choices?: Array<{ message?: { content?: string } }> };
  try {
    data = JSON.parse(rawText) as typeof data;
  } catch {
    throw new GeminiError("智谱响应非 JSON", "PARSE");
  }

  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new GeminiError("智谱返回空内容", "EMPTY");
  }
  return text;
}

export async function zhipuSmokeTest(apiKey: string): Promise<void> {
  try {
    const text = await zhipuChat(apiKey, {
      user: 'Reply with exactly: "pong"',
      temperature: 0,
      maxTokens: 32,
    });
    if (!text.toLowerCase().includes("pong")) {
      throw new GeminiError("智谱响应异常，请检查 Key 与网络", "SMOKE");
    }
  } catch (e) {
    if (e instanceof GeminiError) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    throw new GeminiError(msg || "智谱请求失败", "UNKNOWN");
  }
}

export async function extractTopicsFromSearchText(
  apiKey: string,
  rawSearchText: string
): Promise<TopicCard[]> {
  try {
    assertSearchRawTextUsable(rawSearchText);
    /** 不用 response_format: json_object：该提示要求顶层为数组，与 object-only 模式不兼容 */
    const res = await zhipuChat(apiKey, {
      system: STRUCTURE_EXTRACT_SYSTEM,
      user: structureExtractUserPrompt(rawSearchText),
      maxTokens: 8192,
    });
    const raw = stripJsonFence(res);
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      throw new GeminiError("无法解析热点 JSON，请重试搜索", "JSON_PARSE");
    }
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new GeminiError("热点结构不完整", "SHAPE");
    }

    const cards: TopicCard[] = parsed.slice(0, 5).map((item, i) => {
      const o = (item && typeof item === "object" ? item : {}) as Record<
        string,
        unknown
      >;
      return {
        title: String(o.title ?? `热点 ${i + 1}`),
        time: String(o.time ?? ""),
        hotValue: String(o.hotValue ?? ""),
        summary: String(o.summary ?? ""),
        type: String(o.type ?? "综合"),
      };
    });

    while (cards.length < 5) {
      cards.push({
        title: `待补充条目 ${cards.length + 1}`,
        time: "",
        hotValue: "",
        summary: "",
        type: "综合",
      });
    }

    return cards.slice(0, 5);
  } catch (e) {
    if (e instanceof GeminiError) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    throw new GeminiError(msg || "智谱请求失败", "UNKNOWN");
  }
}

export async function generatePersonas(
  apiKey: string,
  topic: TopicCard
): Promise<PersonaOption[]> {
  try {
    const topicJson = JSON.stringify(topic, null, 2);
    /** 人设为 JSON 数组，避免 json_object 与顶层数组冲突 */
    const res = await zhipuChat(apiKey, {
      system: PERSONA_SYSTEM,
      user: personaUserPrompt(topicJson),
      maxTokens: 8192,
    });
    const raw = stripJsonFence(res);
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      throw new GeminiError("人设 JSON 解析失败", "JSON_PARSE");
    }
    if (!Array.isArray(parsed)) {
      throw new GeminiError("人设格式错误", "SHAPE");
    }
    return parsed.slice(0, 5).map((p, i) => {
      const o = (p && typeof p === "object" ? p : {}) as Record<string, unknown>;
      return {
        label: String(o.label ?? `人设 ${i + 1}`),
        description: String(o.description ?? ""),
      };
    });
  } catch (e) {
    if (e instanceof GeminiError) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    throw new GeminiError(msg || "智谱请求失败", "UNKNOWN");
  }
}

const STANCE_COUNT = 4;

export async function generateStances(
  apiKey: string,
  topic: TopicCard,
  persona: PersonaOption
): Promise<StanceOption[]> {
  try {
    const userText = stanceUserPayload({
      hotspot: {
        title: topic.title,
        time: topic.time,
        hotValue: topic.hotValue,
        summary: topic.summary,
        type: topic.type,
      },
      persona: {
        label: persona.label,
        description: persona.description,
      },
    });
    const res = await zhipuChat(apiKey, {
      json: true,
      system: STANCE_SYSTEM,
      user: userText,
      maxTokens: 8192,
    });
    const raw = stripJsonFence(res);
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      throw new GeminiError("立场 JSON 解析失败", "JSON_PARSE");
    }
    const o = parsed as { stances?: unknown };
    const list = Array.isArray(o.stances) ? o.stances : null;
    if (!list || list.length < STANCE_COUNT) {
      throw new GeminiError("立场数量不足（需 4 条责编口径切入角）", "SHAPE");
    }
    return list.slice(0, STANCE_COUNT).map((s, i) => {
      const r = (s && typeof s === "object" ? s : {}) as Record<string, unknown>;
      return {
        label: String(r.label ?? `切入 ${i + 1}`),
        summary: String(r.summary ?? ""),
      };
    });
  } catch (e) {
    if (e instanceof GeminiError) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    throw new GeminiError(msg || "智谱请求失败", "UNKNOWN");
  }
}

export async function composeFinalPrompt(
  apiKey: string,
  input: {
    topic: TopicCard;
    persona: PersonaOption;
    stance: StanceOption;
  }
): Promise<string> {
  try {
    const payload = finalPromptUserPayload({
      topic: {
        title: input.topic.title,
        time: input.topic.time,
        hotValue: input.topic.hotValue,
        summary: input.topic.summary,
        type: input.topic.type,
      },
      personaLabel: input.persona.label,
      personaDescription: input.persona.description,
      stanceLabel: input.stance.label,
      stanceSummary: input.stance.summary,
    });

    const body = await zhipuChat(apiKey, {
      system: FINAL_PROMPT_SYSTEM,
      user: payload,
      maxTokens: 8192,
    });
    const trimmed = body?.trim();
    if (!trimmed) {
      throw new GeminiError("最终指令生成失败", "EMPTY");
    }

    const fixedHeader = [
      "【完整人设｜以下文字须在长文中贯彻，勿删减为一句话】",
      `名称：${input.persona.label}`,
      `说明：${input.persona.description}`,
      "",
      "【选定立场】",
      `标题：${input.stance.label}`,
      `要点：${input.stance.summary}`,
      "",
      "【风格与可信度补充指引】",
      WRITING_VOICE_GUIDELINES,
      "",
      "—— 以下为可执行的写作系统指令 ——",
      "",
    ].join("\n");

    return `${fixedHeader}${trimmed}`;
  } catch (e) {
    if (e instanceof GeminiError) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    throw new GeminiError(msg || "智谱请求失败", "UNKNOWN");
  }
}
