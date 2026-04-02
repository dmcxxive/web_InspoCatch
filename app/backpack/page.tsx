"use client";

import * as React from "react";
import { toast } from "sonner";
import { Copy, CheckCircle2, Circle, Search } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BackpackItem, Region } from "@/lib/types";
import {
  getBackpack,
  setBackpack,
  updateBackpackItem,
} from "@/lib/storage";

type RegionFilter = "all" | Region;

function itemTags(it: BackpackItem): string[] {
  return it.tags ?? [];
}

export default function BackpackPage() {
  const [regionFilter, setRegionFilter] = React.useState<RegionFilter>("all");
  const [tagFilter, setTagFilter] = React.useState<string>("all");
  const [topicQuery, setTopicQuery] = React.useState("");
  const [items, setItems] = React.useState<BackpackItem[]>([]);

  const refresh = React.useCallback(() => {
    setItems(getBackpack());
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const byRegion = React.useMemo(
    () =>
      items.filter(
        (it) => regionFilter === "all" || it.region === regionFilter
      ),
    [items, regionFilter]
  );

  const allTagsSorted = React.useMemo(() => {
    const set = new Set<string>();
    for (const it of byRegion) {
      for (const t of itemTags(it)) {
        if (t.trim()) set.add(t.trim());
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "zh-CN"));
  }, [byRegion]);

  const filtered = React.useMemo(() => {
    const q = topicQuery.trim().toLowerCase();
    return byRegion.filter((it) => {
      if (tagFilter !== "all") {
        const tags = itemTags(it);
        if (!tags.includes(tagFilter)) return false;
      }
      if (!q) return true;
      const hay = [
        it.topic.title,
        it.topic.summary,
        it.topic.type,
        it.finalPrompt,
        it.stanceLabel,
        it.persona,
      ]
        .join("\n")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [byRegion, tagFilter, topicQuery]);

  React.useEffect(() => {
    if (tagFilter !== "all" && !allTagsSorted.includes(tagFilter)) {
      setTagFilter("all");
    }
  }, [allTagsSorted, tagFilter]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("已复制");
    } catch {
      toast.error("复制失败");
    }
  };

  const togglePublished = (id: string, published: boolean) => {
    updateBackpackItem(id, { published });
    refresh();
    toast.success(published ? "已标记为已发布" : "已取消发布标记");
  };

  const clearAll = () => {
    if (!confirm("确定清空灵感背包？此操作不可恢复。")) return;
    setBackpack([]);
    refresh();
    toast.success("已清空");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">灵感背包</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            已保存的选题与写作指令，数据仅存于本机。先按区服与<strong>标签</strong>筛选，再用下方关键词在标题/正文中二级查找。
          </p>
        </div>
        {items.length > 0 ? (
          <Button type="button" variant="outline" size="sm" onClick={clearAll}>
            清空全部
          </Button>
        ) : null}
      </div>

      <Tabs
        value={regionFilter}
        onValueChange={(v) => setRegionFilter(v as RegionFilter)}
        className="w-full"
      >
        <TabsList>
          <TabsTrigger value="all">全部区服</TabsTrigger>
          <TabsTrigger value="cn">中国区</TabsTrigger>
          <TabsTrigger value="jp">日本区</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-3">
        <p className="text-sm font-medium">按标签筛选</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={tagFilter === "all" ? "default" : "outline"}
            onClick={() => setTagFilter("all")}
          >
            全部标签
          </Button>
          {allTagsSorted.map((t) => (
            <Button
              key={t}
              type="button"
              size="sm"
              variant={tagFilter === t ? "default" : "secondary"}
              className="font-normal"
              onClick={() => setTagFilter(t)}
            >
              {t}
            </Button>
          ))}
        </div>
        {allTagsSorted.length === 0 && byRegion.length > 0 ? (
          <p className="text-muted-foreground text-xs">
            当前列表中的条目尚无保存的探索标签；新保存的选题会带上探索页的标签。
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="backpack-topic-q">话题 / 正文关键词（二级筛选）</Label>
        <div className="relative max-w-md">
          <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            id="backpack-topic-q"
            className="pl-9"
            placeholder="筛选标题、摘要、Prompt、立场…"
            value={topicQuery}
            onChange={(e) => setTopicQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-4">
        {filtered.length === 0 ? (
          <p className="text-muted-foreground py-12 text-center text-sm">
            {items.length === 0
              ? "暂无条目，从首页搜索并在向导中保存后即可出现在这里。"
              : "没有符合当前区服、标签与关键词的条目，请调整筛选条件。"}
          </p>
        ) : (
          <ul className="space-y-4">
            {filtered.map((it) => (
              <li key={it.id}>
                <Card>
                  <CardHeader className="space-y-2 pb-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <CardTitle className="text-base leading-snug">
                        {it.topic.title}
                      </CardTitle>
                      <Badge variant="outline">
                        {it.region === "cn" ? "中国区" : "日本区"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {itemTags(it).map((t, i) => (
                        <Badge key={`${it.id}-t-${i}`} variant="secondary">
                          {t}
                        </Badge>
                      ))}
                      {itemTags(it).length === 0 ? (
                        <span className="text-muted-foreground text-xs">
                          无探索标签
                        </span>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {new Date(it.createdAt).toLocaleString("zh-CN")}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <p>
                      <span className="text-muted-foreground">人设：</span>
                      {it.persona}
                    </p>
                    <p>
                      <span className="text-muted-foreground">立场：</span>
                      {it.stanceLabel}
                    </p>
                    <p className="text-muted-foreground line-clamp-3">
                      {it.finalPrompt}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => handleCopy(it.finalPrompt)}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        复制 Prompt
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={it.published ? "default" : "outline"}
                        onClick={() => togglePublished(it.id, !it.published)}
                      >
                        {it.published ? (
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                        ) : (
                          <Circle className="mr-2 h-4 w-4" />
                        )}
                        {it.published ? "已发布" : "标记已发布"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
