"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { Region, TopicCard } from "@/lib/types";
import { getApiKeys } from "@/lib/storage";
import { searchByRegion, SearchProxyError } from "@/lib/ai/search-proxy";
import {
  extractTopicsFromSearchText,
  GeminiError,
  resolveContentAiKey,
} from "@/lib/ai/content-ai";
import { TopicGrid } from "./TopicGrid";
import { TopicWizard } from "@/components/wizard/TopicWizard";
import { useRegion } from "@/hooks/useRegion";
import {
  TagSearchField,
  buildSearchQueryString,
} from "@/components/search/TagSearchField";
import { SavedTagGroupsBar } from "@/components/search/SavedTagGroupsBar";
import { useSavedTagGroups } from "@/hooks/useSavedTagGroups";

const PPLX_MODEL =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_PERPLEXITY_MODEL?.trim()
    ? process.env.NEXT_PUBLIC_PERPLEXITY_MODEL.trim()
    : "sonar";

type SearchMutationVars = {
  region: Region;
  tags: string[];
  draft: string;
};

export function SearchEngine() {
  const { region, setRegion } = useRegion();
  const [tags, setTags] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const { groups: savedTagGroups, save: saveTagGroup, remove: removeTagGroup } =
    useSavedTagGroups();
  /** 最近一次成功搜索对应的标签快照（写入背包） */
  const [lastSearchTags, setLastSearchTags] = useState<string[]>([]);
  const [topics, setTopics] = useState<TopicCard[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [activeTopic, setActiveTopic] = useState<TopicCard | null>(null);

  const searchMutation = useMutation({
    mutationFn: async (vars: SearchMutationVars) => {
      const keys = getApiKeys();
      if (!resolveContentAiKey(keys).key) {
        throw new Error("CONTENT_AI_KEY");
      }
      if (vars.region === "cn" && !keys.metaso?.trim()) {
        throw new Error("METASO_KEY");
      }
      if (vars.region === "jp" && !keys.perplexity?.trim()) {
        throw new Error("PPLX_KEY");
      }
      const userTag = buildSearchQueryString(vars.tags, vars.draft).trim();
      if (!userTag) {
        throw new Error("EMPTY_TAG");
      }

      const raw = await searchByRegion(
        vars.region,
        keys,
        userTag,
        PPLX_MODEL
      );
      const cards = await extractTopicsFromSearchText(keys, raw);
      return cards;
    },
    onSuccess: (data, vars) => {
      setTopics(data);
      const snapshot = [...vars.tags];
      if (vars.draft.trim()) snapshot.push(vars.draft.trim());
      setLastSearchTags(snapshot);
      toast.success("已解析 5 条热点");
    },
    onError: (err: unknown) => {
      setTopics([]);
      if (err instanceof SearchProxyError) {
        const hint =
          err.code === "METASO_EMPTY"
            ? "（提示：可在浏览器开发者工具 → Network → metaso 查看原始 JSON 是否含 webpages/data）"
            : err.code === "METASO_BUSINESS"
              ? "（提示：多为请求参数或额度问题，请对照秘塔开放平台文档）"
              : "";
        toast.error(`${err.message}${hint}`);
        return;
      }
      if (err instanceof GeminiError) {
        toast.error(err.message);
        return;
      }
      if (err instanceof Error) {
        if (err.message === "CONTENT_AI_KEY") {
          const k = getApiKeys();
          toast.error(
            k.contentAiProvider === "zhipu"
              ? "请先在设置中填写智谱 API Key"
              : "请先在设置中填写 Gemini API Key"
          );
          return;
        }
        if (err.message === "METASO_KEY") {
          toast.error("中国区搜索需要 Metaso API Key");
          return;
        }
        if (err.message === "PPLX_KEY") {
          toast.error("日本区搜索需要 Perplexity API Key");
          return;
        }
        if (err.message === "EMPTY_TAG") {
          toast.error("请输入至少一个标签或关键词");
          return;
        }
        toast.error(err.message);
        return;
      }
      toast.error("搜索失败，请重试");
    },
  });

  const handleSearch = () => {
    searchMutation.mutate({ region, tags, draft });
  };

  const handleSubmitSearchFromField = (
    nextTags: string[],
    nextDraft: string
  ) => {
    searchMutation.mutate({ region, tags: nextTags, draft: nextDraft });
  };

  const openWizard = (topic: TopicCard) => {
    setActiveTopic(topic);
    setWizardOpen(true);
  };

  const queryPreview = buildSearchQueryString(tags, draft).trim();
  const canSaveTagGroup = queryPreview.length > 0;

  const handleSaveTagGroup = () => {
    const payload = [...tags];
    const d = draft.trim();
    if (d) payload.push(d);
    const r = saveTagGroup(payload);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success("已保存标签组");
  };

  const handleApplySavedGroup = (next: string[]) => {
    setTags(next);
    setDraft("");
    toast.success("已载入标签组");
  };

  const handleRemoveSavedGroup = (id: string) => {
    removeTagGroup(id);
    toast("已移除该标签组");
  };

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="explore-tag-field">标签 / 关键词（支持多标签）</Label>
          <TagSearchField
            id="explore-tag-field"
            tags={tags}
            draft={draft}
            onTagsChange={setTags}
            onDraftChange={setDraft}
            onSubmitSearch={handleSubmitSearchFromField}
            disabled={searchMutation.isPending}
            placeholder="输入后按空格确认标签，例如：人工智能"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={searchMutation.isPending}
              onClick={handleSearch}
            >
              <Search className="mr-2 h-4 w-4" />
              搜索并解析
            </Button>
          </div>

          <SavedTagGroupsBar
            groups={savedTagGroups}
            onApply={handleApplySavedGroup}
            onRemove={handleRemoveSavedGroup}
            onSaveClick={handleSaveTagGroup}
            canSave={canSaveTagGroup}
            disabled={searchMutation.isPending}
          />
        </div>

        <Tabs
          value={region}
          onValueChange={(v) => setRegion(v as Region)}
          className="w-full"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm">
                双引擎搜索：中国区使用秘塔 Metaso；日本区使用 Perplexity（界面均为中文）。上方标签对两区均生效。
              </p>
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="cn">中国区 · Metaso</TabsTrigger>
                <TabsTrigger value="jp">日本区 · Perplexity</TabsTrigger>
              </TabsList>
            </div>
          </div>
          <TabsContent value="cn" className="mt-4 space-y-4">
            <p className="text-muted-foreground text-sm">
              日本区会将上述标签组合为日文检索问句模板。
            </p>
          </TabsContent>
          <TabsContent value="jp" className="mt-4 space-y-4">
            <p className="text-muted-foreground text-sm">
              检索问句以日文构造，标签内容会进入用户关键词部分。
            </p>
          </TabsContent>
        </Tabs>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">热点卡片</h2>
        <TopicGrid
          topics={topics}
          isLoading={searchMutation.isPending}
          onSelect={openWizard}
        />
      </section>

      {activeTopic ? (
        <TopicWizard
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          topic={activeTopic}
          region={region}
          exploreTags={lastSearchTags}
        />
      ) : null}
    </div>
  );
}
