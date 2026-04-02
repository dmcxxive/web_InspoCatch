"use client";

import type { StanceOption } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StepStanceProps {
  stances: StanceOption[] | null;
  isLoading: boolean;
  selected: StanceOption | null;
  onSelect: (s: StanceOption) => void;
}

export function StepStance({
  stances,
  isLoading,
  selected,
  onSelect,
}: StepStanceProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (!stances?.length) {
    return (
      <p className="text-muted-foreground text-sm">
        暂无切入角，请检查网络与 API Key 后重试
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {stances.map((s, idx) => {
        const isActive =
          selected?.label === s.label && selected?.summary === s.summary;
        return (
          <li key={`${idx}-${s.label}`}>
            <button
              type="button"
              onClick={() => onSelect(s)}
              className={cn(
                "w-full rounded-lg border p-3 text-left transition-colors",
                isActive
                  ? "border-primary bg-accent"
                  : "hover:bg-muted/50 border-border"
              )}
            >
              <p className="font-medium">{s.label}</p>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                {s.summary}
              </p>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
