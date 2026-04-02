"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, TestTube2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useApiKeys } from "@/hooks/useApiKeys";
import { searchMetaso, searchPerplexity } from "@/lib/ai/search-proxy";
import { geminiSmokeTest } from "@/lib/ai/gemini-client";
import { zhipuSmokeTest } from "@/lib/ai/zhipu-client";
import type { ContentAiProvider } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { keys, setKeys } = useApiKeys();
  const [draft, setDraft] = React.useState(keys);

  React.useEffect(() => {
    setDraft(keys);
  }, [keys]);

  const handleSave = () => {
    setKeys(draft);
    toast.success("已保存到本地（localStorage）");
  };

  const [testing, setTesting] = React.useState<string | null>(null);

  const testGemini = async () => {
    const k = draft.gemini.trim();
    if (!k) {
      toast.error("请先输入 Gemini API Key");
      return;
    }
    setTesting("gemini");
    try {
      await geminiSmokeTest(k);
      toast.success("Gemini 连接正常");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gemini 验证失败");
    } finally {
      setTesting(null);
    }
  };

  const testZhipu = async () => {
    const k = draft.zhipu.trim();
    if (!k) {
      toast.error("请先输入智谱 API Key");
      return;
    }
    setTesting("zhipu");
    try {
      await zhipuSmokeTest(k);
      toast.success("智谱 AI 连接正常");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "智谱验证失败");
    } finally {
      setTesting(null);
    }
  };

  const testMetaso = async () => {
    const k = draft.metaso.trim();
    if (!k) {
      toast.error("请先输入 Metaso API Key");
      return;
    }
    setTesting("metaso");
    try {
      await searchMetaso(k, "test");
      toast.success("Metaso 连接正常");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Metaso 验证失败");
    } finally {
      setTesting(null);
    }
  };

  const testPerplexity = async () => {
    const k = draft.perplexity.trim();
    if (!k) {
      toast.error("请先输入 Perplexity API Key");
      return;
    }
    setTesting("perplexity");
    try {
      await searchPerplexity(k, "hello");
      toast.success("Perplexity 连接正常");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Perplexity 验证失败");
    } finally {
      setTesting(null);
    }
  };

  const setProvider = (p: ContentAiProvider) => {
    setDraft((d) => ({ ...d, contentAiProvider: p }));
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">系统设置</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          API Key 仅保存在本机浏览器 localStorage，不会上传至任何服务器。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>密钥配置</CardTitle>
          <CardDescription>
            中国区搜索需 Metaso，日本区需 Perplexity。热点解析与写作向导（人设、立场、终稿）由下方「内容侧
            AI」二选一，在浏览器直连对应厂商（Gemini 或智谱开放平台）。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
            <div>
              <p className="text-sm font-medium">内容侧 AI（热点解析 / 写作向导）</p>
              <p className="text-muted-foreground mt-1 text-xs">
                国内可选用智谱 GLM（常有免费额度）；亦可用 Gemini。保存后，应用将只调用你选中的这一侧。
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={
                  draft.contentAiProvider === "gemini" ? "default" : "outline"
                }
                className={cn(
                  "h-auto min-h-11 flex-col gap-0.5 py-2",
                  draft.contentAiProvider === "gemini" && "ring-2 ring-primary/30"
                )}
                onClick={() => setProvider("gemini")}
              >
                <span className="font-medium">Google Gemini</span>
                <span className="text-muted-foreground text-[11px] font-normal">
                  通用多模态
                </span>
              </Button>
              <Button
                type="button"
                variant={
                  draft.contentAiProvider === "zhipu" ? "default" : "outline"
                }
                className={cn(
                  "h-auto min-h-11 flex-col gap-0.5 py-2",
                  draft.contentAiProvider === "zhipu" && "ring-2 ring-primary/30"
                )}
                onClick={() => setProvider("zhipu")}
              >
                <span className="font-medium">智谱 AI</span>
                <span className="text-muted-foreground text-[11px] font-normal">
                  GLM · 国内直连
                </span>
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gemini">Gemini API Key</Label>
            <Input
              id="gemini"
              type="password"
              autoComplete="off"
              placeholder="AIza..."
              value={draft.gemini}
              onChange={(e) =>
                setDraft((d) => ({ ...d, gemini: e.target.value }))
              }
            />
            <p className="text-muted-foreground text-xs">
              在{" "}
              <a
                href="https://aistudio.google.com/apikey"
                className="underline underline-offset-2"
                target="_blank"
                rel="noreferrer"
              >
                Google AI Studio
              </a>{" "}
              获取；选「Gemini」为内容侧时必填。
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={testing !== null}
              onClick={testGemini}
            >
              {testing === "gemini" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <TestTube2 className="mr-2 h-4 w-4" />
              )}
              验证 Gemini
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="zhipu">智谱 API Key（GLM）</Label>
            <Input
              id="zhipu"
              type="password"
              autoComplete="off"
              placeholder="在 open.bigmodel.cn 创建"
              value={draft.zhipu}
              onChange={(e) =>
                setDraft((d) => ({ ...d, zhipu: e.target.value }))
              }
            />
            <p className="text-muted-foreground text-xs">
              在{" "}
              <a
                href="https://open.bigmodel.cn/"
                className="underline underline-offset-2"
                target="_blank"
                rel="noreferrer"
              >
                智谱开放平台
              </a>{" "}
              获取；选「智谱」为内容侧时必填。默认模型{" "}
              <code className="rounded bg-muted px-1 text-[11px]">glm-4-flash</code>
              ，可在环境变量{" "}
              <code className="rounded bg-muted px-1 text-[11px]">
                NEXT_PUBLIC_ZHIPU_MODEL
              </code>{" "}
              覆盖。
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={testing !== null}
              onClick={testZhipu}
            >
              {testing === "zhipu" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <TestTube2 className="mr-2 h-4 w-4" />
              )}
              验证智谱
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="metaso">Metaso（秘塔）API Key</Label>
            <Input
              id="metaso"
              type="password"
              autoComplete="off"
              value={draft.metaso}
              onChange={(e) =>
                setDraft((d) => ({ ...d, metaso: e.target.value }))
              }
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={testing !== null}
              onClick={testMetaso}
            >
              {testing === "metaso" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <TestTube2 className="mr-2 h-4 w-4" />
              )}
              验证连接
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="perplexity">Perplexity API Key</Label>
            <Input
              id="perplexity"
              type="password"
              autoComplete="off"
              value={draft.perplexity}
              onChange={(e) =>
                setDraft((d) => ({ ...d, perplexity: e.target.value }))
              }
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={testing !== null}
              onClick={testPerplexity}
            >
              {testing === "perplexity" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <TestTube2 className="mr-2 h-4 w-4" />
              )}
              验证连接
            </Button>
          </div>

          <Button type="button" onClick={handleSave} className="w-full sm:w-auto">
            保存全部
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
