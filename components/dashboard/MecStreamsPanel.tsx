"use client";

import { useDrillDown } from "@/components/drilldown/DrillDownProvider";
import { useDashboard } from "@/components/providers/DashboardProvider";
import { Badge, TONE_DOT } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { IconChevronRight } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import {
  allMecDrill,
  mecGroupDrill,
  mecStatusDrill,
  mecStreamDrill,
} from "@/lib/drilldowns";
import { clamp01, formatPercent, formatRM, formatRMCompact, ratio } from "@/lib/format";
import type { MecStreamBucket, MecSummary } from "@/lib/metrics";
import type { MecStreamGroup } from "@/lib/types";

/**
 * MEC revenue against the RM6,690,000 annual target, broken down by stream.
 *
 * Like the Nasdaq panel, this has its own progress bar: revenue is not capital,
 * so none of it appears in the RM20M figure.
 */
export function MecStreamsPanel({
  summary,
  className,
}: {
  summary: MecSummary;
  className?: string;
}) {
  const { openDrillDown } = useDrillDown();
  const { data } = useDashboard();

  const external = summary.streams.filter((s) => s.group === "external");
  const internal = summary.streams.filter((s) => s.group === "internal");

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader
        title="MEC Asset (HR) Revenue"
        hint={`${formatRM(summary.target)} annual target across eight streams · ${summary.year}`}
        action={
          <button
            type="button"
            onClick={() => openDrillDown(allMecDrill(data))}
            className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-ink-muted transition hover:border-accent-line hover:text-accent"
          >
            All records
            <IconChevronRight className="size-3.5" />
          </button>
        }
      />

      <div className="p-5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="tnum font-display text-3xl font-bold tracking-tight text-ink">
            {formatRM(summary.committed)}
          </span>
          <span className="tnum text-sm text-ink-muted">
            of {formatRM(summary.target)}
          </span>
        </div>
        <p className="mt-1 text-xs text-ink-muted">
          <span className="font-semibold text-committed">
            {formatPercent(summary.committedPct)}
          </span>{" "}
          committed ·{" "}
          <span className="tnum font-medium text-received">
            {formatRM(summary.received)}
          </span>{" "}
          actually paid to MEC ·{" "}
          <span className="tnum">{formatRM(summary.gap)}</span> still to bill
        </p>

        <div className="mt-4">
          <div className="relative h-5 w-full overflow-hidden rounded-full bg-surface-3 ring-1 ring-inset ring-line">
            <div
              aria-hidden
              className="absolute inset-y-0 left-0 bg-idle-soft"
              style={{ width: `${summary.pctWithPipeline * 100}%` }}
            />
            <div
              aria-hidden
              className="absolute inset-y-0 left-0 bg-committed-soft"
              style={{ width: `${summary.committedPct * 100}%` }}
            >
              <span className="hatch absolute inset-0 text-committed opacity-40" />
            </div>
            <button
              type="button"
              onClick={() => openDrillDown(mecStatusDrill(data, "received"))}
              aria-label={`Revenue paid to MEC ${formatRM(summary.received)}. Open details.`}
              title={`Paid to MEC — ${formatRM(summary.received)}`}
              className="absolute inset-y-0 left-0 bg-received transition hover:brightness-110"
              style={{ width: `${summary.receivedPct * 100}%` }}
            />
          </div>
          <p className="mt-2 text-[0.6875rem] text-ink-subtle">
            Solid = paid. Hatched = contracted or invoiced, {formatRM(summary.inFlight)}{" "}
            not yet collected. Faint = enquiries of{" "}
            <span className="tnum">{formatRM(summary.pipeline)}</span>, not counted.
          </p>
        </div>

        <Group
          heading="External"
          note={`${formatRMCompact(summary.externalCommitted)} of ${formatRMCompact(summary.externalTarget)}`}
          streams={external}
          group="external"
        />
        <Group
          heading="Internal"
          note={`${formatRMCompact(summary.internalCommitted)} of ${formatRMCompact(summary.internalTarget)}`}
          streams={internal}
          group="internal"
        />

        <p className="mt-4 rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-[0.6875rem] leading-relaxed text-ink-muted">
          These are operating revenue figures, not capital raised. MEC Asset is
          tracked against its own annual target and contributes RM0 to the
          RM20,000,000 raise.
        </p>
      </div>
    </Card>
  );
}

function Group({
  heading,
  note,
  streams,
  group,
}: {
  heading: string;
  note: string;
  streams: MecStreamBucket[];
  group: MecStreamGroup;
}) {
  const { openDrillDown } = useDrillDown();
  const { data } = useDashboard();

  // Untargeted streams still deserve a bar, so size them against the largest
  // actual in their own group rather than printing "0% of RM0".
  const largest = Math.max(...streams.map((s) => s.committed), 1);

  return (
    <>
      <button
        type="button"
        onClick={() => openDrillDown(mecGroupDrill(data, group))}
        className="mt-5 flex w-full items-center justify-between gap-2 border-b border-line pb-1.5 text-left transition hover:text-accent"
      >
        <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.09em] text-ink-subtle">
          {heading}
        </span>
        <span className="tnum text-[0.6875rem] font-medium text-ink-muted">
          {note}
        </span>
      </button>

      <ul className="mt-1 space-y-0.5">
        {streams.map((stream) => (
          <li key={stream.key}>
            <button
              type="button"
              onClick={() => openDrillDown(mecStreamDrill(data, stream.key))}
              aria-label={`${stream.label} — ${formatRM(stream.committed)} committed${
                stream.hasTarget ? ` of ${formatRM(stream.target)}` : ", no annual target"
              }. Open details.`}
              className="w-full rounded-lg px-2.5 py-2 text-left transition hover:bg-surface-2"
            >
              <span className="flex items-center gap-3">
                <span
                  aria-hidden
                  className={cn("size-2.5 shrink-0 rounded-sm", TONE_DOT[stream.tone])}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-ink">
                    {stream.label}
                    {stream.hasTarget ? null : (
                      <Badge tone="idle" className="px-1.5 py-0.5 text-[0.625rem]">
                        no target
                      </Badge>
                    )}
                  </span>
                  <span className="block text-[0.6875rem] text-ink-subtle">
                    {stream.hint}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="tnum block text-sm font-semibold text-ink">
                    {formatRMCompact(stream.committed)}
                  </span>
                  <span className="tnum block text-[0.6875rem] text-ink-muted">
                    {stream.hasTarget
                      ? `of ${formatRMCompact(stream.target)}`
                      : `${stream.count} ${stream.count === 1 ? "record" : "records"}`}
                  </span>
                </span>
              </span>

              <span
                aria-hidden
                className="mt-1.5 block h-[7px] w-full overflow-hidden rounded-full bg-surface-3"
              >
                <span
                  className="block h-full rounded-full bg-committed"
                  style={{
                    width: `${
                      (stream.hasTarget
                        ? stream.pct
                        : clamp01(ratio(stream.committed, largest))) * 100
                    }%`,
                  }}
                />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
