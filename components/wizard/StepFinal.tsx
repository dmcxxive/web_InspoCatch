"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy } from "lucide-react";
import type { BackpackItem, Region, TopicCard } from "@/lib/types";
import type { PersonaOption, StanceOption } from "@/lib/types";
import { addBackpackItem } from "@/lib/storage";

interface StepFinalProps {
  topic: TopicCard;
  region: Region;
  exploreTags: string[];
  persona: PersonaOption | null;
  stance: StanceOption | null;
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
  finalPrompt,
  isLoading,
  onClose,
}: StepFinalProps) {
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    setSaved(false);
  }, [finalPrompt]);

  const handleCopy = async () => {
    if (!finalPrompt) return;
    try {
      await navigator.clipboard.writeText(finalPrompt);
      toast.success("已复制到剪贴板");
    } catch {
      toast.error("复制失败，请手动选择文本");
    }
  };

  const handleSave = () => {
    if (!finalPrompt || !persona || !stance) return;
    const item: BackpackItem = {
      id: crypto.randomUUID(),
      region,
      tags: exploreTags.length > 0 ? [...exploreTags] : [],
      topic,
      persona: `${persona.label}｜${persona.description}`,
      personaDetail: persona.description,
      stanceLabel: stance.label,
      stanceDetail: stance.summary,
      finalPrompt,
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
      <div className="bg-muted max-h-[min(360px,50vh)] overflow-auto rounded-md p-4 text-sm leading-relaxed">
        <pre className="font-mono whitespace-pre-wrap break-words">
          {finalPrompt}
        </pre>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={handleCopy}>
          <Copy className="mr-2 h-4 w-4" />
          复制到剪贴板
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={saved}
        >
          {saved ? "已保存" : "保存到灵感背包"}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          关闭
        </Button>
      </div>
    </div>
  );
}
