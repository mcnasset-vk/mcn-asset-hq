"use client";

import { useDrillDown } from "@/components/drilldown/DrillDownProvider";
import { useDashboard } from "@/components/providers/DashboardProvider";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { IconChevronRight } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import {
  allNasdaqDrill,
  nasdaqCommittedDrill,
  nasdaqStatusDrill,
} from "@/lib/drilldowns";
import { formatPercent, formatRM, formatRMCompact } from "@/lib/format";
import type { NasdaqSummary } from "@/lib/metrics";
import type { Tone } from "@/lib/types";

const BAR: Record<Tone, string> = {
  received: "bg-received",
  committed: "bg-committed",
  risk: "bg-risk",
  stalled: "bg-stalled",
  idle: "bg-idle",
  accent: "bg-accent",
};

/**
 * Nasdaq listing progress, measured in profit-after-tax.
 *
 * This deliberately has its own progress bar: PAT is not capital, so it never
 * appears in the RM20M figure. Mixing them would overstate the raise.
 */
export function NasdaqPanel({ summary }: { summary: NasdaqSummary }) {
  const { openDrillDown } = useDrillDown();
  const { data } = useDashboard();

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Nasdaq Listing M&A"
        hint="Group profit-after-tax toward the RM6,000,000 listing threshold"
        action={
          <button
            type="button"
            onClick={() => openDrillDown(allNasdaqDrill(data))}
            className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-ink-muted transition hover:border-accent-line hover:text-accent"
          >
            All companies
            <IconChevronRight className="size-3.5" />
          </button>
        }
      />

      <div className="p-5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="tnum font-display text-3xl font-bold tracking-tight text-ink">
            {formatRM(summary.committedPat)}
          </span>
          <span className="tnum text-sm text-ink-muted">
            of {formatRM(summary.target)} PAT
          </span>
        </div>
        <p className="mt-1 text-xs text-ink-muted">
          <span className="font-semibold text-committed">
            {formatPercent(summary.pct)}
          </span>{" "}
          committed from{" "}
          <span className="tnum font-medium text-ink">
            {summary.companiesAgreed}
          </span>{" "}
          of {summary.totalCompanies} companies ·{" "}
          <span className="tnum">{formatRM(summary.gap)}</span> PAT still needed
        </p>

        <div className="mt-4">
          <div className="relative h-5 w-full overflow-hidden rounded-full bg-surface-3 ring-1 ring-inset ring-line">
            <div
              aria-hidden
              className="absolute inset-y-0 left-0 bg-committed-soft"
              style={{ width: `${summary.pctWithPipeline * 100}%` }}
            >
              <span className="hatch absolute inset-0 text-committed opacity-40" />
            </div>
            <button
              type="button"
              onClick={() => openDrillDown(nasdaqCommittedDrill(data))}
              aria-label={`Committed PAT ${formatRM(summary.committedPat)}. Open details.`}
              title={`Committed PAT — ${formatRM(summary.committedPat)}`}
              className="absolute inset-y-0 left-0 bg-committed transition hover:brightness-110"
              style={{ width: `${summary.pct * 100}%` }}
            />
          </div>
          <p className="mt-2 text-[0.6875rem] text-ink-subtle">
            Solid = agreed &amp; onboarded. Hatched = pipeline PAT of{" "}
            <span className="tnum">{formatRM(summary.pipelinePat)}</span>, not
            yet counted.
          </p>
        </div>

        <ul className="mt-4 space-y-1">
          {summary.buckets.map((bucket) => (
            <li key={bucket.key}>
              <button
                type="button"
                onClick={() => openDrillDown(nasdaqStatusDrill(data, bucket.key))}
                disabled={bucket.count === 0}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition",
                  bucket.count > 0
                    ? "hover:bg-surface-2"
                    : "cursor-default opacity-55",
                )}
              >
                <span
                  aria-hidden
                  className={cn("size-2.5 shrink-0 rounded-sm", BAR[bucket.tone])}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-ink">
                    {bucket.label}
                    {bucket.countsTowardTarget ? null : (
                      <Badge tone="idle" className="px-1.5 py-0.5 text-[0.625rem]">
                        pipeline
                      </Badge>
                    )}
                  </span>
                  <span className="block text-[0.6875rem] text-ink-subtle">
                    {bucket.hint}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="tnum block text-sm font-semibold text-ink">
                    {bucket.count}
                  </span>
                  <span className="tnum block text-[0.6875rem] text-ink-muted">
                    {formatRMCompact(bucket.pat)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        <p className="mt-4 rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-[0.6875rem] leading-relaxed text-ink-muted">
          These figures are profit-after-tax, not capital raised. They are
          tracked separately and never counted toward the RM20,000,000 target.
        </p>
      </div>
    </Card>
  );
}
