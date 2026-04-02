import { GoogleGenerativeAI } from "@google/generative-ai";
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

/** 默认使用当前 API 文档中的稳定 Flash；旧版 `gemini-1.5-flash` 可能在 v1beta 上返回 404。 */
function getGeminiModelId(): string {
  if (
    typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_GEMINI_MODEL?.trim()
  ) {
    return process.env.NEXT_PUBLIC_GEMINI_MODEL.trim();
  }
  return "gemini-2.5-flash";
}

export class GeminiError extends Error {
  constructor(
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = "GeminiError";
  }
}

/**
 * 防止把上游搜索 API 的错误说明误交给 Gemini 结构化成「假热点」。
 */
export function assertSearchRawTextUsable(raw: string): void {
  const t = raw.trim();
  if (t.length < 12) {
    throw new GeminiError(
      "搜索返回内容过短，无法解析为热点。请调整关键词或检查上游服务。",
      "RAW_TOO_SHORT"
    );
  }

  const head = t.slice(0, 20000);
  if (
    /错误代码|请求参数错误|参数错误|错误码|搜索系统报告|API\s*Error|invalid[_\s]?request|INVALID_ARGUMENT|parameter\s+error|status\s*[:：]\s*(4\d\d|5\d\d)/i.test(
      head
    )
  ) {
    throw new GeminiError(
      "上游返回了错误说明而非有效检索正文，已阻止当作热点展示。请检查 Metaso/Perplexity 的 Key、额度与查询参数后重试。",
      "RAW_LOOKS_LIKE_API_ERROR"
    );
  }

  if (/"code"\s*:\s*(1000|4\d\d\d)|"code"\s*:\s*"[45]\d\d"/.test(head)) {
    throw new GeminiError(
      "上游返回了带错误码的响应，无法解析为热点。请稍后重试或更换关键词。",
      "RAW_JSON_ERROR_CODE"
    );
  }
}

function getModel(
  apiKey: string,
  opts: { json?: boolean; system?: string } = {}
) {
  const gen = new GoogleGenerativeAI(apiKey);
  return gen.getGenerativeModel({
    model: getGeminiModelId(),
    systemInstruction: opts.system,
    generationConfig: {
      ...(opts.json ? { responseMimeType: "application/json" as const } : {}),
      temperature: opts.json ? 0.2 : 0.5,
    },
  });
}

function stripJsonFence(text: string): string {
  let s = text.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  }
  return s.trim();
}

function mapGeminiError(e: unknown): GeminiError {
  const msg = e instanceof Error ? e.message : String(e);
  if (/API key|API_KEY_INVALID|401/i.test(msg)) {
    return new GeminiError("Gemini API Key 无效", "AUTH");
  }
  if (/429|quota|RESOURCE_EXHAUSTED/i.test(msg)) {
    return new GeminiError("Gemini 额度或速率受限，请稍后重试", "QUOTA");
  }
  if (
    /404|not found for API version|is not supported for generateContent/i.test(
      msg
    )
  ) {
    return new GeminiError(
      `Gemini 模型不可用（当前：${getGeminiModelId()}）。请在 .env.local 设置 NEXT_PUBLIC_GEMINI_MODEL 为 ListModels 中支持的名称，或查阅 ai.google.dev 模型文档。`,
      "MODEL_404"
    );
  }
  return new GeminiError(msg || "Gemini 请求失败", "UNKNOWN");
}

export async function geminiSmokeTest(apiKey: string): Promise<void> {
  try {
    const model = getModel(apiKey, {});
    const r = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: 'Reply with exactly: "pong"' }],
        },
      ],
    });
    const text = r.response.text();
    if (!text?.toLowerCase().includes("pong")) {
      throw new GeminiError("Gemini 响应异常，请检查 Key 与网络", "SMOKE");
    }
  } catch (e) {
    if (e instanceof GeminiError) throw e;
    throw mapGeminiError(e);
  }
}

export async function extractTopicsFromSearchText(
  apiKey: string,
  rawSearchText: string
): Promise<TopicCard[]> {
  try {
    assertSearchRawTextUsable(rawSearchText);
    const model = getModel(apiKey, {
      json: true,
      system: STRUCTURE_EXTRACT_SYSTEM,
    });
    const res = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: structureExtractUserPrompt(rawSearchText) }],
        },
      ],
    });
    const raw = stripJsonFence(res.response.text());
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
    throw mapGeminiError(e);
  }
}

export async function generatePersonas(
  apiKey: string,
  topic: TopicCard
): Promise<PersonaOption[]> {
  try {
    const model = getModel(apiKey, { json: true, system: PERSONA_SYSTEM });
    const topicJson = JSON.stringify(topic, null, 2);
    const res = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: personaUserPrompt(topicJson) }] }],
    });
    const raw = stripJsonFence(res.response.text());
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
    throw mapGeminiError(e);
  }
}

const STANCE_COUNT = 4;

export async function generateStances(
  apiKey: string,
  topic: TopicCard,
  persona: PersonaOption
): Promise<StanceOption[]> {
  try {
    const model = getModel(apiKey, { json: true, system: STANCE_SYSTEM });
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
    const res = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: userText }] }],
    });
    const raw = stripJsonFence(res.response.text());
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
    throw mapGeminiError(e);
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
    const model = getModel(apiKey, { system: FINAL_PROMPT_SYSTEM });
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

    const res = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: payload }] }],
    });

    const body = res.response.text()?.trim();
    if (!body) {
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

    return `${fixedHeader}${body}`;
  } catch (e) {
    if (e instanceof GeminiError) throw e;
    throw mapGeminiError(e);
  }
}
