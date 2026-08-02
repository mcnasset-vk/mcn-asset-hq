"use client";

import { useDrillDown } from "@/components/drilldown/DrillDownProvider";
import { useDashboard } from "@/components/providers/DashboardProvider";
import { Card, CardHeader } from "@/components/ui/Card";
import { IconChevronRight } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { allMdnaDrill, mdnaStatusDrill } from "@/lib/drilldowns";
import { formatRM, formatRMCompact } from "@/lib/format";
import type { MdnaBucket, MdnaSummary } from "@/lib/metrics";
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
 * MDNA members by status. The stacked bar is the whole member base; each
 * segment and each legend row opens that segment's records.
 */
export function MdnaPanel({
  buckets,
  summary,
}: {
  buckets: MdnaBucket[];
  summary: MdnaSummary;
}) {
  const { openDrillDown } = useDrillDown();
  const { data } = useDashboard();
  const totalCount = Math.max(1, summary.totalMembers);

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="MDNA Senior Co-Living"
        hint="RM500,000 package per member · RM50,000 of each invested into MCN Asset HQ"
        action={
          <button
            type="button"
            onClick={() => openDrillDown(allMdnaDrill(data))}
            className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-ink-muted transition hover:border-accent-line hover:text-accent"
          >
            All members
            <IconChevronRight className="size-3.5" />
          </button>
        }
      />

      <div className="p-5">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="tnum font-display text-3xl font-bold tracking-tight text-ink">
            {formatRM(summary.hqReceived)}
          </span>
          <span className="text-sm text-ink-muted">
            banked from{" "}
            <span className="tnum font-semibold text-ink">
              {summary.totalMembers}
            </span>{" "}
            members
          </span>
        </div>
        <p className="mt-1 text-xs text-ink-muted">
          <span className="tnum font-medium text-ink">
            {summary.packagesSold}
          </span>{" "}
          packages paid ={" "}
          <span className="tnum font-medium text-ink">
            {formatRM(summary.packageValue)}
          </span>{" "}
          of package value · {formatRM(summary.hqCommitted)} committed into HQ
        </p>

        {/* Stacked distribution bar */}
        <div className="mt-4 flex h-8 w-full overflow-hidden rounded-md bg-surface-3">
          {buckets.map((bucket) =>
            bucket.count === 0 ? null : (
              <button
                key={bucket.key}
                type="button"
                onClick={() => openDrillDown(mdnaStatusDrill(data, bucket.key))}
                title={`${bucket.label} — ${bucket.count} members`}
                aria-label={`${bucket.label}, ${bucket.count} members. Open details.`}
                className={cn(
                  "flex items-center justify-center transition hover:brightness-110",
                  BAR[bucket.tone],
                )}
                style={{ width: `${(bucket.count / totalCount) * 100}%` }}
              >
                <span className="tnum text-[0.6875rem] font-semibold text-on-bar">
                  {bucket.count}
                </span>
              </button>
            ),
          )}
        </div>

        <ul className="mt-4 space-y-1">
          {buckets.map((bucket) => (
            <li key={bucket.key}>
              <button
                type="button"
                onClick={() => openDrillDown(mdnaStatusDrill(data, bucket.key))}
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
                  <span className="block text-sm font-medium text-ink">
                    {bucket.label}
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
                    {formatRMCompact(bucket.hqValue)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
