"use client";

import { useDrillDown } from "@/components/drilldown/DrillDownProvider";
import { useDashboard } from "@/components/providers/DashboardProvider";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { IconChevronRight, IconWarning } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import {
  allBungalowsDrill,
  renovationLateDrill,
  renovationOverrunDrill,
} from "@/lib/drilldowns";
import { formatPercent, formatRM, formatRMCompact } from "@/lib/format";
import {
  isRenovationLate,
  isRenovationOverrun,
  renovationLateDays,
  type MicanaRenovationSummary,
} from "@/lib/metrics";

/**
 * Renovation budget against actual spend, per bungalow.
 *
 * Two bars per row on a shared scale: budget behind, actual in front. Reading
 * one against the other is the whole point — a single "variance" number hides
 * whether a RM20k overrun is on a RM40k job or a RM400k one.
 */
export function MicanaRenovationPanel({
  summary,
}: {
  summary: MicanaRenovationSummary;
}) {
  const { openDrillDown } = useDrillDown();
  const { data, now } = useDashboard();

  const scale = Math.max(
    1,
    ...summary.active.map((b) => Math.max(b.renovationBudget, b.renovationActual)),
  );
  const late = summary.lateBungalows.length;

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Renovation"
        hint="Fit-out budget against what has actually been spent"
        action={
          <button
            type="button"
            onClick={() => openDrillDown(allBungalowsDrill(data, now))}
            className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-ink-muted transition hover:border-accent-line hover:text-accent"
          >
            All bungalows
            <IconChevronRight className="size-3.5" />
          </button>
        }
      />

      {summary.overrunBungalows.length > 0 ? (
        <button
          type="button"
          onClick={() => openDrillDown(renovationOverrunDrill(data, now))}
          className="flex w-full items-center gap-2.5 border-b border-stalled-line bg-stalled-soft px-5 py-2.5 text-left transition hover:brightness-[0.98]"
        >
          <IconWarning className="size-4 shrink-0 text-stalled" />
          <span className="flex-1 text-xs text-stalled">
            <strong className="tnum font-semibold">
              {formatRM(summary.overrunAmount)}
            </strong>{" "}
            over budget across {summary.overrunBungalows.length}{" "}
            {summary.overrunBungalows.length === 1 ? "bungalow" : "bungalows"}
          </span>
          <IconChevronRight className="size-4 shrink-0 text-stalled" />
        </button>
      ) : null}

      {late > 0 ? (
        <button
          type="button"
          onClick={() => openDrillDown(renovationLateDrill(data, now))}
          className="flex w-full items-center gap-2.5 border-b border-risk-line bg-risk-soft px-5 py-2.5 text-left transition hover:brightness-[0.98]"
        >
          <IconWarning className="size-4 shrink-0 text-risk" />
          <span className="flex-1 text-xs text-risk">
            <strong className="font-semibold">
              {late} {late === 1 ? "renovation is" : "renovations are"}
            </strong>{" "}
            past target completion — every week is rent not being earned
          </span>
          <IconChevronRight className="size-4 shrink-0 text-risk" />
        </button>
      ) : null}

      <div className="grid grid-cols-3 divide-x divide-line border-b border-line">
        <div className="px-5 py-4">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
            Budgeted
          </p>
          <p className="tnum mt-1.5 font-display text-xl font-bold text-ink">
            {formatRMCompact(summary.budget)}
          </p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
            Spent
          </p>
          <p className="tnum mt-1.5 font-display text-xl font-bold text-ink">
            {formatRMCompact(summary.actual)}
          </p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
            Variance
          </p>
          <p
            className={cn(
              "tnum mt-1.5 font-display text-xl font-bold",
              summary.variance > 0 ? "text-stalled" : "text-received",
            )}
          >
            {summary.variance > 0 ? "+" : ""}
            {formatRMCompact(summary.variance)}
          </p>
        </div>
      </div>

      {summary.active.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-ink-muted">
          No renovation budgeted yet.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {summary.active.map((bungalow) => {
            const over = isRenovationOverrun(bungalow);
            const isLate = isRenovationLate(bungalow, now);
            return (
              <li key={bungalow.id}>
                <div className="px-5 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <span className="text-sm font-medium text-ink">
                      {bungalow.bungalowName}
                    </span>
                    <span className="flex items-center gap-1.5">
                      {over ? (
                        <Badge tone="stalled">
                          +{formatRMCompact(bungalow.renovationVariance)} over
                        </Badge>
                      ) : null}
                      {isLate ? (
                        <Badge tone="risk">
                          {renovationLateDays(bungalow, now)} days late
                        </Badge>
                      ) : null}
                      {bungalow.actualCompletionAt ? (
                        <Badge tone="received">Complete</Badge>
                      ) : null}
                    </span>
                  </div>

                  {/* Budget behind, actual in front, on one shared scale. */}
                  <div className="relative mt-2 h-6 w-full overflow-hidden rounded-md bg-surface-3">
                    <div
                      aria-hidden
                      className="absolute inset-y-0 left-0 bg-committed-soft"
                      style={{
                        width: `${(bungalow.renovationBudget / scale) * 100}%`,
                      }}
                    />
                    <div
                      aria-hidden
                      className={cn(
                        "absolute inset-y-0 left-0",
                        over ? "bg-stalled" : "bg-received",
                      )}
                      style={{
                        width: `${(bungalow.renovationActual / scale) * 100}%`,
                      }}
                    />
                  </div>

                  <p className="tnum mt-1.5 text-[0.6875rem] text-ink-subtle">
                    {formatRM(bungalow.renovationActual)} spent of{" "}
                    {formatRM(bungalow.renovationBudget)} budgeted
                    {bungalow.contractor ? ` · ${bungalow.contractor}` : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <footer className="border-t border-line px-5 py-3">
        <p className="text-xs text-ink-muted">
          <span className="tnum font-semibold text-ink">
            {formatPercent(summary.onBudgetPct, 0)}
          </span>{" "}
          of started renovations are within tolerance ·{" "}
          <span className="tnum">{summary.completedCount}</span> complete,{" "}
          <span className="tnum">{summary.inProgressCount}</span> in progress
        </p>
      </footer>
    </Card>
  );
}
