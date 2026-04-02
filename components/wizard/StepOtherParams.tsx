"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";

interface StepOtherParamsProps {
  toneBlend: number;
  onToneBlendChange: (v: number) => void;
  includeImagePromptHints: boolean;
  onIncludeImagePromptHintsChange: (v: boolean) => void;
}

export function StepOtherParams({
  toneBlend,
  onToneBlendChange,
  includeImagePromptHints,
  onIncludeImagePromptHintsChange,
}: StepOtherParamsProps) {
  return (
    <div className="space-y-6 pb-2">
      <p className="text-muted-foreground text-xs leading-relaxed">
        在此微调写作指令生成倾向；后续还可在此页扩展更多调试项。
      </p>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-sm font-medium">语气：学术论证 ↔ 随意</Label>
          <span className="text-muted-foreground text-xs tabular-nums">
            {toneBlend}/100
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="w-14 shrink-0">学术</span>
          <input
            type="range"
            min={0}
            max={100}
            value={toneBlend}
            onChange={(e) => onToneBlendChange(Number(e.target.value))}
            className="accent-primary h-2 w-full cursor-pointer"
            aria-label="语气轴：学术论证到随意口语"
          />
          <span className="w-14 shrink-0 text-right">随意</span>
        </div>
        <p className="text-muted-foreground text-xs leading-relaxed">
          越靠近「随意」，生成的写作指令越引导口语化、个人化与情绪表达；越靠近「学术」，越强调例证、调研感与客观论述。始终贴合人设。
        </p>
      </div>

      <div className="space-y-2">
        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 transition-colors hover:bg-muted/40">
          <input
            type="checkbox"
            checked={includeImagePromptHints}
            onChange={(e) => onIncludeImagePromptHintsChange(e.target.checked)}
            className="border-input text-primary focus-visible:ring-ring mt-0.5 h-4 w-4 rounded border"
          />
          <span className="text-sm leading-snug">
            <span className="font-medium">在写作指令中加入可供 AI 自动搜图 / 配图的说明</span>
            <span className="text-muted-foreground mt-1 block text-xs">
              勾选后，最终指令中会包含如何让下游按关键词找图或插入配图占位的写法。
            </span>
          </span>
        </label>
      </div>
    </div>
  );
}
