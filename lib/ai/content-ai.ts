/**
 * 内容侧 AI 统一入口：按用户在设置中选择的提供商路由到 Gemini 或智谱 GLM。
 */
import type {
  ApiKeys,
  ContentAiProvider,
  PersonaOption,
  StanceOption,
  TopicCard,
} from "@/lib/types";
import * as gemini from "@/lib/ai/gemini-client";
import * as zhipu from "@/lib/ai/zhipu-client";

export { GeminiError } from "@/lib/ai/gemini-client";

export function resolveContentAiKey(keys: ApiKeys): {
  provider: ContentAiProvider;
  key: string;
} {
  const provider = keys.contentAiProvider ?? "gemini";
  if (provider === "zhipu") {
    return { provider: "zhipu", key: keys.zhipu.trim() };
  }
  return { provider: "gemini", key: keys.gemini.trim() };
}

export async function extractTopicsFromSearchText(
  keys: ApiKeys,
  rawSearchText: string
): Promise<TopicCard[]> {
  const { provider, key } = resolveContentAiKey(keys);
  if (provider === "zhipu") {
    return zhipu.extractTopicsFromSearchText(key, rawSearchText);
  }
  return gemini.extractTopicsFromSearchText(key, rawSearchText);
}

export async function generatePersonas(
  keys: ApiKeys,
  topic: TopicCard
): Promise<PersonaOption[]> {
  const { provider, key } = resolveContentAiKey(keys);
  if (provider === "zhipu") {
    return zhipu.generatePersonas(key, topic);
  }
  return gemini.generatePersonas(key, topic);
}

export async function generateStances(
  keys: ApiKeys,
  topic: TopicCard,
  persona: PersonaOption
): Promise<StanceOption[]> {
  const { provider, key } = resolveContentAiKey(keys);
  if (provider === "zhipu") {
    return zhipu.generateStances(key, topic, persona);
  }
  return gemini.generateStances(key, topic, persona);
}

export async function composeFinalPrompt(
  keys: ApiKeys,
  input: {
    topic: TopicCard;
    persona: PersonaOption;
    stance: StanceOption;
    toneBlend: number;
    includeImagePromptHints: boolean;
  }
): Promise<string> {
  const { provider, key } = resolveContentAiKey(keys);
  if (provider === "zhipu") {
    return zhipu.composeFinalPrompt(key, input);
  }
  return gemini.composeFinalPrompt(key, input);
}
