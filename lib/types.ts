export type Region = "cn" | "jp";

/** 热点解析、人设/立场/终稿等内容侧调用使用的模型提供商 */
export type ContentAiProvider = "gemini" | "zhipu";

export interface ApiKeys {
  /** 内容侧（解析热点、向导）实际调用的提供商 */
  contentAiProvider: ContentAiProvider;
  gemini: string;
  /** 智谱开放平台 API Key（GLM，OpenAI 兼容接口） */
  zhipu: string;
  metaso: string;
  perplexity: string;
}

export interface TopicCard {
  title: string;
  time: string;
  hotValue: string;
  summary: string;
  type: string;
}

export interface BackpackItem {
  id: string;
  region: Region;
  /** 探索页确认的标签（空格 tag 化），用于背包内按标签筛选 */
  tags?: string[];
  topic: TopicCard;
  /** 人设展示用：建议含「名称 + 完整说明」 */
  persona: string;
  /** 人设完整说明（可选，便于背包展示与再编辑） */
  personaDetail?: string;
  stanceLabel: string;
  stanceDetail: string;
  finalPrompt: string;
  createdAt: string;
  published: boolean;
  /** 向导「其他参数」：0=学术论证，100=随意口语 */
  toneBlend?: number;
  /** 是否在写作指令中含 AI 搜图/配图说明 */
  includeImagePromptHints?: boolean;
  /** 委托 API 生成的成品 Markdown（可选） */
  generatedMarkdown?: string;
  articleGeneratedAt?: string;
}

export interface PersonaOption {
  label: string;
  description: string;
}

export interface StanceOption {
  label: string;
  summary: string;
}

/** 探索页保存的标签组检索快照（localStorage，最多 5 条） */
export interface SavedTagGroup {
  id: string;
  tags: string[];
  createdAt: string;
}
