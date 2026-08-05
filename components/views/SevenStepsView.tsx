"use client";

import { useState } from "react";

import { StepScoreBar } from "@/components/dashboard/StepScoreBar";
import { useDrillDown } from "@/components/drilldown/DrillDownProvider";
import { CapitalStepForm } from "@/components/forms/CapitalStepForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { useDashboard } from "@/components/providers/DashboardProvider";
import { Badge, TONE_TEXT } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { IconChevronRight } from "@/components/ui/icons";
import { CAPITAL_STEP_STATES } from "@/lib/constants";
import { capitalStepDrill } from "@/lib/drilldowns";
import { formatDate, formatPercent, formatRM } from "@/lib/format";
import {
  getCapitalReadiness,
  getCapitalSummary,
  type CapitalStepProgress,
} from "@/lib/metrics";

/**
 * 成交资本7步 — 《创造企业价值～成交资本7步》, OE Edugroup 杰青商学院.
 *
 * The raise has a money view (RM20M against a deadline) and this one: whether
 * the enterprise value that makes the money closable actually exists yet. Both
 * are computed from the same records, so a step cannot look strong while the
 * pipeline behind it is empty.
 */
export function SevenStepsView() {
  const { data, now } = useDashboard();
  const [editing, setEditing] = useState<CapitalStepProgress | null>(null);

  const readiness = getCapitalReadiness(data, now);
  const capital = getCapitalSummary(data, now);

  return (
    <>
      <PageHeader
        eyebrow="Value Framework"
        title="成交资本7步 · Seven Steps to Closing Capital"
        description={
          <>
            Capital closes when the enterprise behind it is worth closing on.
            Every step below is scored from records already in this dashboard —
            move a factory to invested and step 1 moves; pay an introducer and
            step 6 moves. Click any step to see exactly which records produced
            its score.
          </>
        }
      />

      {/* Readiness against the money -------------------------------------- */}
      <Card>
        <div className="grid gap-px bg-line sm:grid-cols-3">
          <div className="bg-surface px-5 py-4">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
              Capital readiness
            </p>
            <p className="tnum mt-1.5 font-display text-3xl font-bold tracking-tight text-ink">
              {formatPercent(readiness.index, 0)}
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">
              Equal-weighted across all seven steps
            </p>
          </div>
          <div className="bg-surface px-5 py-4">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
              Steps closed
            </p>
            <p className="tnum mt-1.5 font-display text-3xl font-bold tracking-tight text-received">
              {readiness.closed}
              <span className="text-xl text-ink-subtle"> / 7</span>
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {readiness.unowned > 0
                ? `${readiness.unowned} steps have no owner yet`
                : "Every step has an owner"}
            </p>
          </div>
          <div className="bg-surface px-5 py-4">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
              Capital banked
            </p>
            <p className="tnum mt-1.5 font-display text-3xl font-bold tracking-tight text-ink">
              {formatPercent(capital.receivedPct, 0)}
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {formatRM(capital.received)} of {formatRM(capital.target)} ·{" "}
              {capital.daysLeft} days left
            </p>
          </div>
        </div>

        <div className="border-t border-line px-5 py-3.5">
          <p className="text-xs leading-relaxed text-ink-muted">
            The binding constraint is{" "}
            <span className="zh font-semibold text-ink">
              {readiness.weakest.zh}
            </span>{" "}
            <span className="text-ink-subtle">({readiness.weakest.label})</span>{" "}
            at {formatPercent(readiness.weakest.score, 0)} —{" "}
            {readiness.weakest.reading}. The strongest is{" "}
            <span className="zh font-semibold text-ink">
              {readiness.strongest.zh}
            </span>{" "}
            at {formatPercent(readiness.strongest.score, 0)}.
          </p>
        </div>
      </Card>

      {/* The seven steps --------------------------------------------------- */}
      <ol className="mt-4 space-y-3">
        {readiness.steps.map((step) => (
          <li key={step.key}>
            <Card>
              <div className="flex flex-wrap items-start gap-4 px-5 py-4">
                <span
                  aria-hidden
                  className={`tnum mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-2 font-display text-lg font-bold ${TONE_TEXT[step.tone]}`}
                >
                  {step.step}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    <h2 className="zh font-display text-lg font-semibold tracking-tight text-ink">
                      {step.zh}
                      <span className="text-ink-subtle">～</span>
                      {step.zhOutcome}
                    </h2>
                    <Badge tone={step.tone} dot>
                      <span className="zh">{step.stateZh}</span>
                      <span className="text-[0.6875rem] opacity-80">
                        {step.stateLabel}
                      </span>
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    {step.label} — {step.outcome}
                  </p>

                  <div className="mt-3 flex items-center gap-3">
                    <StepScoreBar score={step.score} tone={step.tone} />
                    <span
                      className={`tnum shrink-0 text-sm font-semibold ${TONE_TEXT[step.tone]}`}
                    >
                      {formatPercent(step.score, 0)}
                    </span>
                  </div>

                  <p className="tnum mt-2 text-sm font-medium text-ink">
                    {step.measure}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {step.reading}
                  </p>
                  <p className="mt-1.5 text-[0.6875rem] text-ink-subtle">
                    Measured by: {step.proof.toLowerCase()}
                  </p>
                </div>
              </div>

              {/* The plan — the only part a human writes ------------------ */}
              <div className="flex flex-wrap items-end justify-between gap-3 border-t border-line bg-surface-2 px-5 py-3">
                <dl className="grid min-w-0 flex-1 gap-x-6 gap-y-2 sm:grid-cols-3">
                  <div className="min-w-0">
                    <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
                      Owner
                    </dt>
                    <dd className="truncate text-sm text-ink">
                      {step.plan?.ownerName || "—"}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
                      Next action
                    </dt>
                    <dd className="truncate text-sm text-ink">
                      {step.plan?.focus || "—"}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
                      Target
                    </dt>
                    <dd className="tnum truncate text-sm text-ink">
                      {step.plan?.targetDate
                        ? formatDate(step.plan.targetDate)
                        : "—"}
                    </dd>
                  </div>
                </dl>

                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(step)}
                    className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted transition hover:border-accent-line hover:text-accent"
                  >
                    Edit plan
                  </button>
                  <StepRecordsButton stepKey={step.key} />
                </div>
              </div>

              {step.plan?.notes ? (
                <p className="border-t border-line px-5 py-2.5 text-xs leading-relaxed text-ink-muted">
                  {step.plan.notes}
                </p>
              ) : null}
            </Card>
          </li>
        ))}
      </ol>

      {/* How to read the scores ------------------------------------------- */}
      <Card className="mt-4">
        <div className="px-5 py-4">
          <h2 className="text-[0.9375rem] font-semibold tracking-tight text-ink">
            How these scores work
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
            Each step is a ratio of what the records show to what the step
            requires. Three of the denominators are board figures already in use
            — RM20,000,000 for step 1 and RM6,000,000 of profit-after-tax for
            step 7. The rest are house assumptions kept in{" "}
            <code className="rounded bg-surface-3 px-1 py-0.5 text-[0.6875rem]">
              lib/constants.ts
            </code>{" "}
            so changing a target changes every score, bar and reading at once.
            No step can be marked complete by hand.
          </p>
          <dl className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {(
              Object.keys(CAPITAL_STEP_STATES) as (keyof typeof CAPITAL_STEP_STATES)[]
            ).map((key) => {
              const meta = CAPITAL_STEP_STATES[key];
              return (
                <div
                  key={key}
                  className="rounded-lg border border-line bg-surface-2 px-3 py-2.5"
                >
                  <dt>
                    <Badge tone={meta.tone} dot>
                      <span className="zh">{meta.zh}</span>
                      <span className="text-[0.6875rem] opacity-80">
                        {meta.label}
                      </span>
                    </Badge>
                  </dt>
                  <dd className="mt-1.5 text-[0.6875rem] leading-relaxed text-ink-muted">
                    {meta.hint}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
        <footer className="border-t border-line px-5 py-3">
          <p className="text-[0.6875rem] leading-relaxed text-ink-subtle">
            Framework: 《创造企业价值～成交资本7步》 · OE Edugroup 杰青商学院 ·
            实战 · 易学 · 落地
          </p>
        </footer>
      </Card>

      <CapitalStepForm
        open={editing !== null}
        onClose={() => setEditing(null)}
        step={editing}
      />
    </>
  );
}

/** Split out so the drill-down hook is not called inside the step loop body. */
function StepRecordsButton({ stepKey }: { stepKey: CapitalStepProgress["key"] }) {
  const { openDrillDown } = useDrillDown();
  const { data, now } = useDashboard();

  return (
    <button
      type="button"
      onClick={() => openDrillDown(capitalStepDrill(data, stepKey, now))}
      className="inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-accent-hover"
    >
      Evidence
      <IconChevronRight className="size-3.5" />
    </button>
  );
}
