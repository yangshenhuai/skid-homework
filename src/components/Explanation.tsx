import { ExplanationMode } from "@/store/settings-store";
import { useTranslation } from "react-i18next";
import { MemoizedMarkdown } from "./markdown/MarkdownRenderer";
import { ExplanationStep } from "@/store/problems-store";
import { useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Kbd } from "./ui/kbd";
import { useHotkeys } from "react-hotkeys-hook";

export type ExplanationProps = {
  mode: ExplanationMode;
  content?: string | null;
  steps?: ExplanationStep[] | null;
};

export default function Explanation({
  mode,
  content,
  steps,
}: ExplanationProps) {
  const { t } = useTranslation("commons", { keyPrefix: "solution-viewer" });

  if (mode === "explanation") {
    return (
      <div>
        <div className="mb-1 text-sm font-medium text-black dark:text-slate-300">
          {t("explanation")}
        </div>

        <div className="rounded-lg bg-slate-300/60 dark:bg-slate-900/60 p-3">
          <MemoizedMarkdown source={content ?? "<Empty Explanation>"} />
        </div>
      </div>
    );
  }

  // steps mode
  return <StepExplanation steps={steps} />;
}

function StepExplanation({
  steps,
}: {
  steps: ExplanationStep[] | null | undefined;
}) {
  const [visibleStepCounter, setVisibleStepCounter] = useState(1);

  const visibleSteps = useMemo(() => {
    return steps?.slice(0, visibleStepCounter);
  }, [visibleStepCounter, steps]);

  const nextHint = () => {
    if (visibleStepCounter >= (steps?.length ?? 0)) {
      // no more available steps
      return;
    }
    setVisibleStepCounter((c) => c + 1);
  };

  useHotkeys("c", nextHint);

  return (
    <>
      {visibleSteps?.map((step) => {
        return (
          <>
            <Label className="text-3xl">{step.title}</Label>
            <MemoizedMarkdown source={step.content} />
          </>
        );
      }) ?? "No steps available."}

      <Button
        onClick={nextHint}
        disabled={visibleStepCounter >= (steps?.length ?? 0)}
      >
        Hint me ({visibleSteps?.length}/{steps?.length}) <Kbd>C</Kbd>
      </Button>
    </>
  );
}
