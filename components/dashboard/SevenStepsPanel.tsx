"use client";

import Link from "next/link";

import { useDrillDown } from "@/components/drilldown/DrillDownProvider";
import { useDashboard } from "@/components/providers/DashboardProvider";
import { Card, CardHeader } from "@/components/ui/Card";
import { IconChevronRight } from "@/components/ui/icons";
import { TONE_TEXT } from "@/components/ui/Badge";
import { capitalStepDrill } from "@/lib/drilldowns";
import { formatPercent } from "@/lib/format";
import type { CapitalReadiness } from "@/lib/metrics";

import { StepScoreBar } from "./StepScoreBar";

/**
 * The 成交资本7步 scorecard in one card, for the executive overview. Each row
 * opens the records that produced its score; the header links to the full page
 * where the plan against each step is maintained.
 */
export function SevenStepsPanel({ readiness }: { readiness: CapitalReadiness }) {
  const { openDrillDown } = useDrillDown();
  const { data, now } = useDashboard();

  return (
    <Card className="flex flex-col">
      <CardHeader
        title={
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="zh">成交资本7步</span>
            <span className="text-xs font-normal text-ink-muted">
              Seven Steps to Closing Capital
            </span>
          </span>
        }
        hint="Enterprise value that has to exist before RM20M can be closed — scored from the records, not from opinion"
        action={
          <Link
            href="/seven-steps"
            className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-ink-muted transition hover:border-accent-line hover:text-accent"
          >
            Scorecard
            <IconChevronRight className="size-3.5" />
          </Link>
        }
      />

      <div className="border-b border-line px-5 py-4">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="tnum font-display text-3xl font-bold tracking-tight text-ink">
            {formatPercent(readiness.index, 0)}
          </span>
          <span className="text-sm text-ink-muted">
            capital readiness ·{" "}
            <span className="tnum font-semibold text-ink">
              {readiness.closed}
            </span>{" "}
            of 7 steps closed
          </span>
        </div>
        <p className="mt-1 text-xs text-ink-muted">
          Weakest link:{" "}
          <span className="zh font-medium text-ink">
            {readiness.weakest.zh}
          </span>{" "}
          <span className="text-ink-subtle">
            ({readiness.weakest.label}) at {formatPercent(readiness.weakest.score, 0)}
          </span>
        </p>
      </div>

      <ul className="divide-y divide-line">
        {readiness.steps.map((step) => (
          <li key={step.key}>
            <button
              type="button"
              onClick={() => openDrillDown(capitalStepDrill(data, step.key, now))}
              className="flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-surface-2"
            >
              <span className="tnum w-4 shrink-0 text-xs font-semibold text-ink-subtle">
                {step.step}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className="zh text-sm font-medium text-ink">
                    {step.zh}
                  </span>
                  <span className="text-[0.6875rem] text-ink-subtle">
                    {step.label}
                  </span>
                </span>
                <StepScoreBar
                  score={step.score}
                  tone={step.tone}
                  className="mt-1.5"
                />
              </span>
              <span className="shrink-0 text-right">
                <span
                  className={`tnum block text-sm font-semibold ${TONE_TEXT[step.tone]}`}
                >
                  {formatPercent(step.score, 0)}
                </span>
                <span className="block text-[0.6875rem] text-ink-subtle">
                  {step.stateLabel}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <footer className="border-t border-line px-5 py-3">
        <p className="text-[0.6875rem] leading-relaxed text-ink-subtle">
          Framework: 《创造企业价值～成交资本7步》 · OE Edugroup 杰青商学院
        </p>
      </footer>
    </Card>
  );
}
