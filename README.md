# 灵感捕手 (InspoCatch)

本地优先的 AI 公众号写作辅助工具：双区联网搜索（中国区 Metaso / 日本区 Perplexity）→ **Gemini** 结构化解析热点 → 三步向导生成可粘贴至 Gemini 的长文写作指令。所有 API Key 与背包数据仅保存在浏览器 **localStorage**，无云端账号体系。

## 技术栈

- Next.js 14（App Router）+ TypeScript
- Tailwind CSS + shadcn/ui 风格组件 + Lucide React
- TanStack React Query + Sonner（Toast）
- `@google/generative-ai`（浏览器端调用 Gemini）

## 快速开始

```bash
cd inspocatch
npm install
npm run dev
```

浏览器打开 [http://localhost:3000](http://localhost:3000)。首次使用请到 **设置** 页填写三个 API Key 并保存。

## 获取 API Key

### Gemini（Google AI Studio）

1. 打开 [Google AI Studio](https://aistudio.google.com/apikey)（需可用网络环境）。
2. 登录 Google 账号，创建 API Key。
3. 将 Key 粘贴到本应用「设置 → Gemini API Key」。

用于：热点 JSON 结构化、人设与立场生成、最终长文指令生成。默认模型：`gemini-2.5-flash`（可通过环境变量 `NEXT_PUBLIC_GEMINI_MODEL` 覆盖，见下表）。

### Metaso（秘塔 AI 搜索）

1. 打开 [秘塔 AI 搜索 API](https://metaso.cn/search-api/api-keys)。
2. 按平台指引注册并创建 API Key。
3. 粘贴到「设置 → Metaso API Key」。

用于：**中国区** Tab 下的联网搜索。服务端代理：`POST /api/search/metaso`，内部与 MCP 工具 **metaso_web_search** 一致调用 `https://metaso.cn/api/v1/search`（`q`、`scope=webpage`、`includeSummary`、`includeRawContent`、`size`）。若检索正文过短，会自动再调用 **metaso_chat** 对应接口 `POST https://metaso.cn/api/v1/chat/completions`（`model: fast`），与 [MCP 说明](https://metaso.cn/api/mcp) 及开源参考 [csrts/metaso-mcp](https://github.com/csrts/metaso-mcp) 中的 REST 一致。

| 环境变量（可选，服务端） | 说明 |
|--------------------------|------|
| `METASO_INCLUDE_RAW_CONTENT` 或 `NEXT_PUBLIC_METASO_INCLUDE_RAW` | 设为 `true` 时，搜索请求带 `includeRawContent: true`（抓取原文，体积更大）。 |

**排查「无可用内容」**：打开开发者工具 → Network → `/api/search/metaso`。成功时 `ok: true` 且 `text` 为长字符串；`meta.usedChatFallback` 为 `true` 表示已用 chat 回退。若 `ok: false` 且 `METASO_EMPTY`，请核对 Key、额度；或开启上述环境变量后重启 dev server。

### Perplexity

1. 打开 [Perplexity API](https://www.perplexity.ai/settings/api)。
2. 开通 API 并创建 Key。
3. 粘贴到「设置 → Perplexity API Key」。

用于：**日本区** Tab 下的联网搜索。默认模型为 `sonar`（与 OpenAI 兼容的 `chat/completions`）。若你的账号支持 `pplx-7b-online` 或其它模型，可在项目根目录 `.env.local` 中设置：

```env
NEXT_PUBLIC_PERPLEXITY_MODEL=pplx-7b-online
```

## 可选环境变量

| 变量 | 说明 |
|------|------|
| `NEXT_PUBLIC_DEFAULT_REGION` | `cn` 或 `jp`，首次进入时默认区服（仍可在首页切换）。 |
| `NEXT_PUBLIC_GEMINI_MODEL` | 覆盖 Gemini 模型 ID，默认 `gemini-2.5-flash`。若出现 404「model not found」，请改为 [官方文档](https://ai.google.dev/gemini-api/docs/models/gemini) 中当前可用的名称（如 `gemini-2.5-pro`）。 |
| `NEXT_PUBLIC_PERPLEXITY_MODEL` | 覆盖日本区 Perplexity 模型名，默认 `sonar`。 |

**请勿**在仓库或代码中写死任何 API Key；仅通过设置页写入 localStorage。

## 功能概要

- **双引擎搜索**：中国/日本 Tab 布局一致；检索问句格式按需求分别为中文与日文构造（日本区 UI 仍为中文）。
- **结构化热点**：Gemini 将搜索原文整理为 5 条卡片（`title`, `time`, `hotValue`, `summary`, `type`）。
- **向导**：人设（5 选 1）→ 立场（2 选 1）→ 组合生成最终 Prompt；支持复制与保存到「灵感背包」。
- **灵感 backpack**：按区域筛选、复制、标记已发布。

## 目录约定

- `components/search` — `SearchEngine.tsx`, `TopicGrid.tsx`
- `components/wizard` — `TopicWizard.tsx`, `StepPersona.tsx`, `StepStance.tsx`, `StepFinal.tsx`
- `lib/ai` — `gemini-client.ts`, `search-proxy.ts`
- `lib/prompts.ts` — 人设、立场、结构化抽取等提示模板

## 构建

```bash
npm run build
npm start
```

## 许可

仅供学习与个人本地使用；各第三方 API 的使用需遵守其服务条款与计费规则。
