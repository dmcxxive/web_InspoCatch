"use client";

import { Bookmark, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SavedTagGroup } from "@/lib/types";
import { MAX_SAVED_TAG_GROUPS } from "@/lib/storage";
import { cn } from "@/lib/utils";

function previewLabel(tags: string[]): string {
  const s = tags.join(" · ");
  if (s.length <= 36) return s;
  return `${s.slice(0, 34)}…`;
}

interface SavedTagGroupsBarProps {
  groups: SavedTagGroup[];
  onApply: (tags: string[]) => void;
  onRemove: (id: string) => void;
  onSaveClick: () => void;
  canSave: boolean;
  disabled?: boolean;
  className?: string;
}

export function SavedTagGroupsBar({
  groups,
  onApply,
  onRemove,
  onSaveClick,
  canSave,
  disabled,
  className,
}: SavedTagGroupsBarProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || !canSave}
          onClick={onSaveClick}
          className="gap-1.5"
        >
          <Bookmark className="h-3.5 w-3.5" />
          保存当前组合
        </Button>
        <span className="text-muted-foreground text-xs">
          已存 {groups.length}/{MAX_SAVED_TAG_GROUPS} 组 · 仅本机
        </span>
      </div>
      {groups.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {groups.map((g) => (
            <div
              key={g.id}
              className="bg-muted/60 flex max-w-full items-center gap-1 rounded-md border px-2 py-1 text-sm"
            >
              <button
                type="button"
                disabled={disabled}
                className="min-w-0 truncate text-left hover:underline"
                title={g.tags.join(" ")}
                onClick={() => onApply(g.tags)}
              >
                {previewLabel(g.tags)}
              </button>
              <button
                type="button"
                disabled={disabled}
                className="text-muted-foreground hover:text-foreground shrink-0 rounded p-0.5"
                aria-label={`删除已存标签组 ${previewLabel(g.tags)}`}
                onClick={() => onRemove(g.id)}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">
          保存后将出现在此处；点击文案可载入到上方标签栏（不会自动搜索）。
        </p>
      )}
    </div>
  );
}
