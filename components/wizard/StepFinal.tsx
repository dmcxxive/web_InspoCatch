"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, ExternalLink } from "lucide-react";
import type { BackpackItem, Region, TopicCard } from "@/lib/types";
import type { PersonaOption, StanceOption } from "@/lib/types";
import { addBackpackItem } from "@/lib/storage";

/** 豆包网页版对话入口（新标签页打开） */
const DOUBAO_CHAT_URL = "https://www.doubao.com/chat";

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

  React.useEffect(() => {
    setSaved(false);
  }, [finalPrompt]);

  React.useEffect(() => {
    if (finalPrompt != null) {
      setEditedPrompt(finalPrompt);
    }
  }, [finalPrompt]);

  const handleCopy = async () => {
    if (!editedPrompt.trim()) return;
    try {
      await navigator.clipboard.writeText(editedPrompt);
      toast.success("已复制到剪贴板");
    } catch {
      toast.error("复制失败，请手动选择文本");
    }
  };

  const handleCopyAndOpenDoubao: React.MouseEventHandler<HTMLAnchorElement> = async (
    e
  ) => {
    e.preventDefault();
    if (!editedPrompt.trim()) {
      toast.error("写作指令为空，无法复制");
      return;
    }
    try {
      await navigator.clipboard.writeText(editedPrompt);
      toast.success("已复制写作指令，正在打开豆包");
      window.open(DOUBAO_CHAT_URL, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("复制失败，请手动复制后访问豆包");
      window.open(DOUBAO_CHAT_URL, "_blank", "noopener,noreferrer");
    }
  };

  const handleSave = () => {
    if (!persona || !stance) return;
    if (!editedPrompt.trim()) {
      toast.error("写作指令不能为空");
      return;
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
      finalPrompt: editedPrompt.trim(),
      toneBlend,
      includeImagePromptHints,
      createdAt: new Date().toISOString(),
      published: false,
    };
    addBackpackItem(item);
    setSaved(true);
    toast.success("已加入灵感背包");
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

  return (
    <div className="space-y-4">
      <label className="text-muted-foreground text-xs font-medium">
        写作指令（可直接编辑）
      </label>
      <textarea
        value={editedPrompt}
        onChange={(e) => setEditedPrompt(e.target.value)}
        className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring max-h-[min(360px,50vh)] min-h-[200px] w-full rounded-md border px-3 py-2 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        spellCheck={false}
      />

      <div className="space-y-1.5">
        <a
          href={DOUBAO_CHAT_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleCopyAndOpenDoubao}
          className="text-primary inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-4 hover:text-primary/90"
        >
          复制并跳转至豆包
          <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
        </a>
        <p className="text-muted-foreground text-xs leading-relaxed">
          将先把当前框内写作指令复制到剪贴板，再打开豆包网页版；在输入框中粘贴即可成文。
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" onClick={handleCopy}>
          <Copy className="mr-2 h-4 w-4" />
          仅复制到剪贴板
        </Button>
        <Button type="button" onClick={handleSave} disabled={saved}>
          {saved ? "已保存" : "保存到灵感背包"}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          关闭
        </Button>
      </div>
    </div>
  );
}
