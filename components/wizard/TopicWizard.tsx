"use client";

import * as React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { PersonaOption, Region, StanceOption, TopicCard } from "@/lib/types";
import { getApiKeys } from "@/lib/storage";
import {
  composeFinalPrompt,
  generatePersonas,
  generateStances,
  GeminiError,
  resolveContentAiKey,
} from "@/lib/ai/content-ai";
import { StepPersona } from "./StepPersona";
import { StepStance } from "./StepStance";
import { StepFinal } from "./StepFinal";

interface TopicWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topic: TopicCard;
  region: Region;
  /** 探索页本次搜索使用的标签快照，写入背包 */
  exploreTags: string[];
}

type Step = 1 | 2 | 3;

export function TopicWizard({
  open,
  onOpenChange,
  topic,
  region,
  exploreTags,
}: TopicWizardProps) {
  const [step, setStep] = React.useState<Step>(1);
  const [selectedPersona, setSelectedPersona] =
    React.useState<PersonaOption | null>(null);
  const [selectedStance, setSelectedStance] =
    React.useState<StanceOption | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setStep(1);
    setSelectedPersona(null);
    setSelectedStance(null);
  }, [open, topic.title]);

  React.useEffect(() => {
    setSelectedStance(null);
  }, [selectedPersona]);

  const apiKeysSnapshot = getApiKeys();
  const contentAiKey = resolveContentAiKey(apiKeysSnapshot).key;

  const personasQuery = useQuery({
    queryKey: [
      "personas",
      topic.title,
      topic.summary,
      open,
      apiKeysSnapshot.contentAiProvider,
    ],
    enabled: open && step === 1 && !!contentAiKey?.trim(),
    queryFn: async () => {
      const keys = getApiKeys();
      if (!resolveContentAiKey(keys).key) throw new Error("NO_KEY");
      return generatePersonas(keys, topic);
    },
  });

  const stancesQuery = useQuery({
    queryKey: [
      "stances",
      topic.title,
      topic.summary,
      open,
      step,
      apiKeysSnapshot.contentAiProvider,
      selectedPersona?.label,
      selectedPersona?.description,
    ],
    enabled:
      open && step === 2 && !!contentAiKey?.trim() && !!selectedPersona,
    queryFn: async () => {
      const keys = getApiKeys();
      const p = selectedPersona;
      if (!resolveContentAiKey(keys).key || !p) throw new Error("NO_KEY");
      return generateStances(keys, topic, p);
    },
  });

  const finalMutation = useMutation({
    mutationFn: async (vars: {
      persona: PersonaOption;
      stance: StanceOption;
    }) => {
      const keys = getApiKeys();
      if (!resolveContentAiKey(keys).key) throw new Error("NO_KEY");
      return composeFinalPrompt(keys, {
        topic,
        persona: vars.persona,
        stance: vars.stance,
      });
    },
    onError: (e: unknown) => {
      if (e instanceof GeminiError) {
        toast.error(e.message);
        return;
      }
      toast.error("生成失败，请重试");
    },
  });

  React.useEffect(() => {
    if (personasQuery.isError) {
      const e = personasQuery.error;
      if (e instanceof GeminiError) toast.error(e.message);
      else toast.error("人设生成失败");
    }
  }, [personasQuery.isError, personasQuery.error]);

  React.useEffect(() => {
    if (stancesQuery.isError) {
      const e = stancesQuery.error;
      if (e instanceof GeminiError) toast.error(e.message);
      else toast.error("切入角生成失败");
    }
  }, [stancesQuery.isError, stancesQuery.error]);

  const runFinal = React.useCallback(
    (persona: PersonaOption, stance: StanceOption) => {
      const keys = getApiKeys();
      if (!resolveContentAiKey(keys).key) {
        toast.error(
          keys.contentAiProvider === "zhipu"
            ? "请先在设置中填写智谱 API Key"
            : "请先在设置中填写 Gemini API Key"
        );
        return;
      }
      finalMutation.mutate({ persona, stance });
    },
    [finalMutation]
  );

  const handleNext = () => {
    if (step === 1) {
      if (!selectedPersona) {
        toast.error("请选择一个人设");
        return;
      }
      setSelectedStance(null);
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!selectedStance) {
        toast.error("请选一个责编切入角");
        return;
      }
      setStep(3);
      if (selectedPersona) runFinal(selectedPersona, selectedStance);
      return;
    }
  };

  const handleBack = () => {
    if (step === 2) setStep(1);
    else if (step === 3) {
      finalMutation.reset();
      setStep(2);
    }
  };

  const title =
    step === 1
      ? "第一步：选择人设"
      : step === 2
        ? "第二步：责编口径 · 切入角（4 选 1）"
        : "第三步：写作指令";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">
            基于热点事件生成公众号写作向导
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 pb-2">
          <p className="text-muted-foreground text-xs font-medium">当前事件</p>
          <p className="text-sm font-semibold leading-snug">{topic.title}</p>
        </div>

        {step === 1 ? (
          <StepPersona
            personas={personasQuery.data ?? null}
            isLoading={personasQuery.isLoading}
            selected={selectedPersona}
            onSelect={setSelectedPersona}
          />
        ) : null}

        {step === 2 ? (
          <div className="space-y-3">
            {selectedPersona ? (
              <div className="bg-muted/50 text-muted-foreground rounded-md border border-dashed px-3 py-2 text-xs leading-relaxed">
                <span className="font-medium text-foreground">已定人设 · </span>
                {selectedPersona.label}
                <span className="mx-1">·</span>
                <span className="line-clamp-2">{selectedPersona.description}</span>
              </div>
            ) : null}
            <StepStance
              stances={stancesQuery.data ?? null}
              isLoading={stancesQuery.isLoading}
              selected={selectedStance}
              onSelect={setSelectedStance}
            />
          </div>
        ) : null}

        {step === 3 ? (
          <StepFinal
            topic={topic}
            region={region}
            exploreTags={exploreTags}
            persona={selectedPersona}
            stance={selectedStance}
            finalPrompt={finalMutation.data ?? null}
            isLoading={finalMutation.isPending}
            onClose={() => onOpenChange(false)}
          />
        ) : null}

        {step < 3 ? (
          <div className="flex flex-wrap justify-between gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={step === 1}
              onClick={handleBack}
            >
              上一步
            </Button>
            <Button type="button" onClick={handleNext}>
              下一步
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
