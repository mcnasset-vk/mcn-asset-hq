"use client";

import { useDrillDown } from "@/components/drilldown/DrillDownProvider";
import { useDashboard } from "@/components/providers/DashboardProvider";
import { Card, CardHeader } from "@/components/ui/Card";
import { IconChevronRight } from "@/components/ui/icons";
import { allFactoriesDrill, allMdnaDrill, inFlightDrill } from "@/lib/drilldowns";
import { formatRM } from "@/lib/format";
import type { CapitalSummary, GapCloser as GapCloserData } from "@/lib/metrics";

/**
 * Restates the funding gap in deals rather than ringgit. "RM14.8M to go" is
 * abstract; "15 factories or 296 members" tells you where to point the teams.
 */
export function GapCloser({
  gap,
  capital,
}: {
  gap: GapCloserData;
  capital: CapitalSummary;
}) {
  const { openDrillDown } = useDrillDown();
  const { data, now } = useDashboard();

  return (
    <Card>
      <CardHeader
        title="Closing the Gap"
        hint={`${formatRM(gap.gap)} still to raise in ${capital.daysLeft} days`}
      />

      <div className="grid gap-px bg-line sm:grid-cols-3">
        <Option
          heading="All factories"
          figure={`${gap.factoriesNeeded}`}
          unit="more factories"
          detail="RM1,000,000 into HQ each"
          onClick={() => openDrillDown(allFactoriesDrill(data, now))}
        />
        <Option
          heading="All members"
          figure={`${gap.membersNeeded}`}
          unit="more MDNA members"
          detail="RM50,000 into HQ each"
          onClick={() => openDrillDown(allMdnaDrill(data))}
        />
        <Option
          heading="Or a blend"
          figure={`${gap.blendFactories} + ${gap.blendMembers}`}
          unit="factories + members"
          detail="after everything already committed banks"
          onClick={() => openDrillDown(inFlightDrill(data, now))}
        />
      </div>

      <footer className="border-t border-line px-5 py-3">
        <p className="text-xs leading-relaxed text-ink-muted">
          If every commitment currently in flight completes, the remaining gap
          drops to{" "}
          <span className="tnum font-semibold text-ink">
            {formatRM(gap.gapAfterCommitted)}
          </span>
          . The blend assumes that happens first, then splits what is left
          evenly between the two teams.
        </p>
      </footer>
    </Card>
  );
}

function Option({
  heading,
  figure,
  unit,
  detail,
  onClick,
}: {
  heading: string;
  figure: string;
  unit: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group bg-surface px-5 py-4 text-left transition hover:bg-surface-2"
    >
      <span className="flex items-center justify-between gap-2">
        <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
          {heading}
        </span>
        <IconChevronRight className="size-4 text-ink-subtle transition group-hover:translate-x-0.5 group-hover:text-accent" />
      </span>
      <span className="tnum mt-2 block font-display text-3xl font-bold tracking-tight text-accent">
        {figure}
      </span>
      <span className="mt-0.5 block text-sm font-medium text-ink">{unit}</span>
      <span className="mt-1 block text-[0.6875rem] text-ink-subtle">
        {detail}
      </span>
    </button>
  );
}
