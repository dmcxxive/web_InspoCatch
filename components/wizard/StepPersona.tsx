"use client";

import type { PersonaOption } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// remove mistaken import of 'loading' - fix
// I'll fix the file - remove `import loading from ...`

interface StepPersonaProps {
  personas: PersonaOption[] | null;
  isLoading: boolean;
  selected: PersonaOption | null;
  onSelect: (p: PersonaOption) => void;
}

export function StepPersona({
  personas,
  isLoading,
  selected,
  onSelect,
}: StepPersonaProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!personas?.length) {
    return (
      <p className="text-muted-foreground text-sm">暂时没有人能设数据</p>
    );
  }

  return (
    <ul className="space-y-2">
      {personas.map((p, idx) => {
        const isActive =
          selected?.label === p.label && selected?.description === p.description;
        return (
          <li key={`${idx}-${p.label}`}>
            <button
              type="button"
              onClick={() => onSelect(p)}
              className={cn(
                "w-full rounded-lg border p-3 text-left transition-colors",
                isActive
                  ? "border-primary bg-accent"
                  : "hover:bg-muted/50 border-border"
              )}
            >
              <p className="font-medium">{p.label}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {p.description}
              </p>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
