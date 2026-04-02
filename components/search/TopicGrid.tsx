"use client";

import type { TopicCard } from "@/lib/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Flame } from "lucide-react";

interface TopicGridProps {
  topics: TopicCard[];
  isLoading: boolean;
  onSelect: (topic: TopicCard) => void;
}

function GridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card
          key={i}
          className="overflow-hidden rounded-xl border-slate-200 shadow-sm"
        >
          <CardHeader className="space-y-3 p-5 pb-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-2 px-5 pb-5 pt-0">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-6 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function TopicGrid({ topics, isLoading, onSelect }: TopicGridProps) {
  if (isLoading) {
    return <GridSkeleton />;
  }

  if (topics.length === 0) {
    return (
      <p className="text-muted-foreground py-12 text-center text-sm">
        输入标签并搜索，热点卡片将显示在这里
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {topics.map((topic, idx) => {
        const timeLabel = topic.time?.trim() || "未提供";
        return (
          <button
            key={`${topic.title}-${idx}`}
            type="button"
            onClick={() => onSelect(topic)}
            className="text-left transition-transform hover:scale-[1.01] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Card className="h-full cursor-pointer rounded-xl border-slate-200 bg-card shadow-sm transition-colors hover:border-slate-300 hover:shadow-md">
              <CardHeader className="space-y-3 p-5 pb-2">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="line-clamp-2 text-base font-bold leading-snug text-slate-900">
                    {topic.title}
                  </h3>
                  <Flame
                    className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
                    aria-hidden
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-500">{timeLabel}</span>
                  <Badge
                    variant="secondary"
                    className="rounded-full border-0 bg-sky-50 px-2.5 py-0.5 font-normal text-sky-800 hover:bg-sky-50"
                  >
                    热度 {topic.hotValue?.trim() || "—"}
                  </Badge>
                  {topic.type?.trim() ? (
                    <Badge
                      variant="secondary"
                      className="rounded-full border-0 bg-slate-100 px-2.5 py-0.5 font-normal text-slate-700 hover:bg-slate-100"
                    >
                      {topic.type}
                    </Badge>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5 pt-0">
                <p className="line-clamp-4 text-sm leading-relaxed text-slate-600">
                  {topic.summary}
                </p>
              </CardContent>
            </Card>
          </button>
        );
      })}
    </div>
  );
}
