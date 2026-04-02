"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface TagSearchFieldProps {
  id: string;
  tags: string[];
  draft: string;
  onTagsChange: (next: string[]) => void;
  onDraftChange: (next: string) => void;
  /** 回车：先收起当前词为标签，再带上本次 tags/draft 触发搜索（避免闭包滞后） */
  onSubmitSearch?: (nextTags: string[], nextDraft: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/** 输入关键词后按空格确认为一枚标签；可与多标签组合成检索语句。 */
export function TagSearchField({
  id,
  tags,
  draft,
  onTagsChange,
  onDraftChange,
  placeholder,
  disabled,
  className,
  onSubmitSearch,
}: TagSearchFieldProps) {
  /** 中文等 IME 组字期间，空格/回车由输入法占用，不可当作「收为标签」 */
  const imeComposingRef = React.useRef(false);

  const isImeComposing = (e: React.KeyboardEvent<HTMLInputElement>) =>
    imeComposingRef.current || e.nativeEvent.isComposing === true;

  const commitDraft = React.useCallback(() => {
    const t = draft.trim();
    if (!t) return;
    onTagsChange([...tags, t]);
    onDraftChange("");
  }, [draft, tags, onTagsChange, onDraftChange]);

  const removeTag = (index: number) => {
    onTagsChange(tags.filter((_, i) => i !== index));
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="bg-muted/40 flex min-h-10 flex-wrap items-center gap-2 rounded-md border border-input px-2 py-1.5">
        {tags.map((tag, i) => (
          <Badge
            key={`${tag}-${i}`}
            variant="secondary"
            className="gap-1 pr-1 font-normal"
          >
            {tag}
            <button
              type="button"
              disabled={disabled}
              className="hover:bg-muted rounded-sm p-0.5"
              onClick={() => removeTag(i)}
              aria-label={`移除标签 ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <Input
          id={id}
          className="min-w-[12rem] flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
          placeholder={placeholder}
          value={draft}
          disabled={disabled}
          onCompositionStart={() => {
            imeComposingRef.current = true;
          }}
          onCompositionEnd={() => {
            imeComposingRef.current = false;
          }}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === " " || e.code === "Space") {
              if (isImeComposing(e)) return;
              if (draft.trim()) {
                e.preventDefault();
                commitDraft();
              }
            }
            if (e.key === "Enter") {
              if (isImeComposing(e)) return;
              e.preventDefault();
              const t = draft.trim();
              let nextTags = [...tags];
              let nextDraft = draft;
              if (t) {
                nextTags = [...tags, t];
                nextDraft = "";
                onTagsChange(nextTags);
                onDraftChange("");
              }
              onSubmitSearch?.(nextTags, nextDraft);
            }
            if (e.key === "Backspace" && !draft && tags.length > 0) {
              if (isImeComposing(e)) return;
              onTagsChange(tags.slice(0, -1));
            }
          }}
        />
      </div>
      <p className="text-muted-foreground text-xs">
        输入后按<strong>空格</strong>将当前词收为标签（中文输入法选词时的空格不会误触发）；可多枚标签组合检索。回车也会先收起当前词。
      </p>
    </div>
  );
}

/** 将标签与未提交的草稿拼成发给 Metaso/Perplexity 的查询串 */
export function buildSearchQueryString(tags: string[], draft: string): string {
  const parts = [...tags];
  const d = draft.trim();
  if (d) parts.push(d);
  return parts.join(" ");
}
