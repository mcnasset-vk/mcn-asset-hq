"use client";

import { useDrillDown } from "@/components/drilldown/DrillDownProvider";
import { useDashboard } from "@/components/providers/DashboardProvider";
import { Card, CardHeader } from "@/components/ui/Card";
import { IconChevronRight } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { allBungalowsDrill, micanaStageDrill } from "@/lib/drilldowns";
import { formatRMCompact } from "@/lib/format";
import { isBungalowExited, type MicanaStageBucket } from "@/lib/metrics";
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
 * Bungalow sourcing, from first sighting to operating.
 *
 * Bar width tracks how many bungalows have reached each stage or beyond, so
 * the funnel narrows monotonically. Bungalows that left the programme are
 * excluded entirely rather than sitting in a terminal stage — otherwise the
 * shape would dip in the middle and read as a bottleneck that is not there.
 */
export function MicanaSourcingFunnel({
  stages,
}: {
  stages: MicanaStageBucket[];
}) {
  const { openDrillDown } = useDrillDown();
  const { data, now } = useDashboard();
  const maxReached = Math.max(1, ...stages.map((s) => s.reachedCount));
  const exited = data.bungalows.filter(isBungalowExited).length;

  return (
    <Card>
      <CardHeader
        title="Bungalow Sourcing"
        hint="From first sighting, through the owner agreement and fit-out, to letting rooms"
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

      <ol className="space-y-2.5 p-5">
        {stages.map((stage, index) => {
          const width = (stage.reachedCount / maxReached) * 100;
          return (
            <li key={stage.key}>
              <button
                type="button"
                onClick={() =>
                  openDrillDown(micanaStageDrill(data, stage.key, now))
                }
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
                  </span>
                  <span className="flex items-baseline gap-2">
                    <span className="tnum text-sm font-semibold text-ink">
                      {stage.count}
                    </span>
                    <span className="text-xs text-ink-subtle">here now</span>
                    <span className="tnum text-xs font-medium text-ink-muted">
                      {stage.roomCount} rooms
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
          If every bungalow in the pipeline opens:{" "}
          <span className="tnum font-semibold text-ink">
            {stages.reduce((t, s) => t + s.roomCount, 0)} rooms
          </span>{" "}
          across{" "}
          <span className="tnum font-semibold text-ink">
            {stages[0]?.reachedCount ?? 0} bungalows
          </span>{" "}
          · renovation budgeted{" "}
          <span className="tnum font-semibold text-ink">
            {formatRMCompact(
              stages.reduce((t, s) => t + s.renovationBudget, 0),
            )}
          </span>
          {exited > 0 ? (
            <>
              {" "}
              · {exited} exited the programme and are not shown above
            </>
          ) : null}
        </p>
      </footer>
    </Card>
  );
}
