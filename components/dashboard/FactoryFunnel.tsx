"use client";

import { useDrillDown } from "@/components/drilldown/DrillDownProvider";
import { useDashboard } from "@/components/providers/DashboardProvider";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { IconChevronRight, IconWarning } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import {
  allFactoriesDrill,
  factoryStageDrill,
  stalledFactoriesDrill,
} from "@/lib/drilldowns";
import { formatRM, formatRMCompact } from "@/lib/format";
import type { StageBucket } from "@/lib/metrics";
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
 * Four-stage onboarding funnel. Bar width tracks how many factories have
 * reached each stage or beyond, so the funnel narrows monotonically; the
 * headline number is how many are sitting there right now.
 */
export function FactoryFunnel({
  stages,
  stalledCount,
}: {
  stages: StageBucket[];
  stalledCount: number;
}) {
  const { openDrillDown } = useDrillDown();
  const { data, now } = useDashboard();
  const maxReached = Math.max(1, ...stages.map((s) => s.reachedCount));

  return (
    <Card>
      <CardHeader
        title="Factory Cosif Pipeline"
        hint="RM4M disbursed per factory · RM1M of that invested into MCN Asset HQ"
        action={
          <button
            type="button"
            onClick={() => openDrillDown(allFactoriesDrill(data, now))}
            className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-ink-muted transition hover:border-accent-line hover:text-accent"
          >
            All factories
            <IconChevronRight className="size-3.5" />
          </button>
        }
      />

      {stalledCount > 0 ? (
        <button
          type="button"
          onClick={() => openDrillDown(stalledFactoriesDrill(data, now))}
          className="flex w-full items-center gap-2.5 border-b border-stalled-line bg-stalled-soft px-5 py-2.5 text-left transition hover:brightness-[0.98]"
        >
          <IconWarning className="size-4 shrink-0 text-stalled" />
          <span className="flex-1 text-xs text-stalled">
            <strong className="font-semibold">
              {stalledCount} {stalledCount === 1 ? "factory is" : "factories are"}
            </strong>{" "}
            past the expected disbursement window
          </span>
          <IconChevronRight className="size-4 shrink-0 text-stalled" />
        </button>
      ) : null}

      <ol className="space-y-2.5 p-5">
        {stages.map((stage, index) => {
          const width = (stage.reachedCount / maxReached) * 100;
          return (
            <li key={stage.key}>
              <button
                type="button"
                onClick={() => openDrillDown(factoryStageDrill(data, stage.key, now))}
                disabled={stage.count === 0}
                className={cn(
                  "group flex w-full flex-col gap-2 rounded-lg border border-transparent p-2.5 text-left transition",
                  stage.count > 0
                    ? "hover:border-line hover:bg-surface-2"
                    : "cursor-default opacity-60",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <span className="flex items-center gap-2 text-sm font-medium text-ink">
                    <span className="tnum text-xs text-ink-subtle">
                      {index + 1}
                    </span>
                    {stage.label}
                    {stage.stalledCount > 0 ? (
                      <Badge tone="stalled">
                        {stage.stalledCount} stalled
                      </Badge>
                    ) : null}
                  </span>
                  <span className="flex items-baseline gap-2">
                    <span className="tnum text-sm font-semibold text-ink">
                      {stage.count}
                    </span>
                    <span className="text-xs text-ink-subtle">here now</span>
                    <span className="tnum text-xs font-medium text-ink-muted">
                      {formatRMCompact(stage.hqValue)}
                    </span>
                  </span>
                </div>

                <div className="relative h-7 w-full overflow-hidden rounded-md bg-surface-3">
                  <div
                    className={cn(
                      "flex h-full items-center px-2.5 transition-all",
                      BAR[stage.tone],
                      stage.count > 0 && "group-hover:brightness-110",
                    )}
                    style={{ width: `${Math.max(width, 8)}%` }}
                  >
                    <span className="tnum whitespace-nowrap text-[0.6875rem] font-semibold text-on-bar">
                      {stage.reachedCount} reached
                    </span>
                  </div>
                </div>

                <p className="text-[0.6875rem] text-ink-subtle">{stage.hint}</p>
              </button>
            </li>
          );
        })}
      </ol>

      <footer className="border-t border-line px-5 py-3">
        <p className="text-xs text-ink-muted">
          Pipeline value if every factory completes:{" "}
          <span className="tnum font-semibold text-ink">
            {formatRM(stages[0]?.reachedHqValue ?? 0)}
          </span>{" "}
          into HQ
        </p>
      </footer>
    </Card>
  );
}
