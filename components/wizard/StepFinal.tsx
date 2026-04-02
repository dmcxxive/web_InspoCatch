"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, Loader2 } from "lucide-react";
import type { BackpackItem, Region, TopicCard } from "@/lib/types";
import type { PersonaOption, StanceOption } from "@/lib/types";
import { addBackpackItem, getApiKeys } from "@/lib/storage";
import {
  generateFullArticle,
  GeminiError,
  resolveContentAiKey,
} from "@/lib/ai/content-ai";

interface StepFinalProps {
  topic: TopicCard;
  region: Region;
  exploreTags: string[];
  persona: PersonaOption | null;
  stance: StanceOption | null;
  toneBlend: number;
  includeImagePromptHints: boolean;
  finalPrompt: string | null;
  isLoading: boolean;
  onClose: () => void;
}

export function StepFinal({
  topic,
  region,
  exploreTags,
  persona,
  stance,
  toneBlend,
  includeImagePromptHints,
  finalPrompt,
  isLoading,
  onClose,
}: StepFinalProps) {
  const [editedPrompt, setEditedPrompt] = React.useState("");
  const [saved, setSaved] = React.useState(false);
  const [alsoGenerateArticle, setAlsoGenerateArticle] = React.useState(false);

  React.useEffect(() => {
    setSaved(false);
    setAlsoGenerateArticle(false);
  }, [finalPrompt]);

  React.useEffect(() => {
    if (finalPrompt != null) {
      setEditedPrompt(finalPrompt);
    }
  }, [finalPrompt]);

  const saveMutation = useMutation({
    mutationFn: async (): Promise<{
      requestedArticle: boolean;
      articleOk: boolean;
    }> => {
      if (!persona || !stance) throw new Error("NO_CONTEXT");
      const keys = getApiKeys();
      if (!resolveContentAiKey(keys).key) throw new Error("NO_KEY");
      const promptText = editedPrompt.trim();
      if (!promptText) throw new Error("EMPTY_PROMPT");

      let generatedMarkdown: string | undefined;
      let articleGeneratedAt: string | undefined;
      let articleOk = false;
      if (alsoGenerateArticle) {
        try {
          generatedMarkdown = await generateFullArticle(keys, {
            topic,
            finalPromptText: promptText,
            includeImagePromptHints,
          });
          articleGeneratedAt = new Date().toISOString();
          articleOk = true;
        } catch (e) {
          const msg =
            e instanceof GeminiError
              ? e.message
              : "成文请求失败";
          toast.error(`${msg}；将仅保存写作指令`);
        }
      }

      const item: BackpackItem = {
        id: crypto.randomUUID(),
        region,
        tags: exploreTags.length > 0 ? [...exploreTags] : [],
        topic,
        persona: `${persona.label}｜${persona.description}`,
        personaDetail: persona.description,
        stanceLabel: stance.label,
        stanceDetail: stance.summary,
        finalPrompt: promptText,
        toneBlend,
        includeImagePromptHints,
        generatedMarkdown,
        articleGeneratedAt,
        createdAt: new Date().toISOString(),
        published: false,
      };
      addBackpackItem(item);
      return {
        requestedArticle: alsoGenerateArticle,
        articleOk,
      };
    },
    onSuccess: (data) => {
      setSaved(true);
      if (data.requestedArticle && data.articleOk) {
        toast.success("已保存并生成全文至灵感背包");
      } else if (data.requestedArticle && !data.articleOk) {
        toast.success("已保存写作指令（成文未写入）");
      } else {
        toast.success("已加入灵感背包");
      }
    },
    onError: (e: unknown) => {
      if (e instanceof GeminiError) {
        toast.error(e.message);
        return;
      }
      if (e instanceof Error && e.message === "EMPTY_PROMPT") {
        toast.error("写作指令不能为空");
        return;
      }
      if (e instanceof Error && e.message === "NO_KEY") {
        toast.error("请先在设置中填写内容侧 API Key");
        return;
      }
      toast.error("保存失败");
    },
  });

  const handleCopy = async () => {
    if (!editedPrompt.trim()) return;
    try {
      await navigator.clipboard.writeText(editedPrompt);
      toast.success("已复制到剪贴板");
    } catch {
      toast.error("复制失败，请手动选择文本");
    }
  };

  const handleSave = () => {
    if (!persona || !stance) return;
    const keys = getApiKeys();
    if (!resolveContentAiKey(keys).key) {
      toast.error(
        keys.contentAiProvider === "zhipu"
          ? "请先在设置中填写智谱 API Key"
          : "请先在设置中填写 Gemini API Key"
      );
      return;
    }
    if (!editedPrompt.trim()) {
      toast.error("写作指令不能为空");
      return;
    }
    saveMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (!finalPrompt) {
    return (
      <p className="text-muted-foreground text-sm">未能生成写作指令</p>
    );
  }

  const saving = saveMutation.isPending;

  return (
    <div className="space-y-4">
      <label className="text-muted-foreground text-xs font-medium">
        写作指令（可直接编辑）
      </label>
      <textarea
        value={editedPrompt}
        onChange={(e) => setEditedPrompt(e.target.value)}
        disabled={saving}
        className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring max-h-[min(360px,50vh)] min-h-[200px] w-full rounded-md border px-3 py-2 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        spellCheck={false}
      />

      <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 transition-colors hover:bg-muted/40">
        <input
          type="checkbox"
          checked={alsoGenerateArticle}
          onChange={(e) => setAlsoGenerateArticle(e.target.checked)}
          disabled={saving || saved}
          className="border-input text-primary focus-visible:ring-ring mt-0.5 h-4 w-4 rounded border"
        />
        <span className="text-sm leading-snug">
          <span className="font-medium">
            保存到灵感背包时，同时委托 API 生成成品文章（Markdown
            {includeImagePromptHints ? "，含配图/搜图占位" : "，不含配图指令"}）
          </span>
          <span className="text-muted-foreground mt-1 block text-xs">
            成文失败时仍会保存写作指令，全文不会写入背包。
          </span>
        </span>
      </label>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={handleCopy} disabled={saving}>
          <Copy className="mr-2 h-4 w-4" />
          复制到剪贴板
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={saved || saving}
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {alsoGenerateArticle ? "正在生成全文…" : "保存中…"}
            </>
          ) : saved ? (
            "已保存"
          ) : (
            "保存到灵感背包"
          )}
        </Button>
        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
          关闭
        </Button>
      </div>
    </div>
  );
}
