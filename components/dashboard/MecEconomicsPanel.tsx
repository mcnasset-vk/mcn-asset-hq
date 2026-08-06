"use client";

import { useDrillDown } from "@/components/drilldown/DrillDownProvider";
import { useDashboard } from "@/components/providers/DashboardProvider";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { IconChevronRight } from "@/components/ui/icons";
import { MEC_COUNTS_TOWARD_RAISE } from "@/lib/constants";
import { mecDerivedDrill } from "@/lib/drilldowns";
import { formatRM, formatRMCompact } from "@/lib/format";
import type { MecPerStaff, MecSummary } from "@/lib/metrics";

/**
 * What MEC's revenue turns into: the 10% flowing up to MCN, the 20% operating
 * and profit-sharing pool, and the PAT the per-staff economics are built on.
 */
export function MecEconomicsPanel({
  summary,
  perStaff,
}: {
  summary: MecSummary;
  perStaff: MecPerStaff;
}) {
  const { openDrillDown } = useDrillDown();
  const { data } = useDashboard();

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Where the Revenue Goes"
        hint="Derived live from revenue paid to MEC — click any figure for the records behind it"
      />

      <div className="grid gap-px bg-line sm:grid-cols-3">
        <Figure
          heading="Upward to MCN"
          figure={formatRMCompact(summary.upwardReceived)}
          unit="10% of revenue paid"
          detail={`${formatRMCompact(summary.upwardCommitted)} once everything committed is collected`}
          onClick={() => openDrillDown(mecDerivedDrill(data, "upward"))}
        />
        <Figure
          heading="Operating pool"
          figure={formatRMCompact(summary.poolReceived)}
          unit="20% operating & profit share"
          detail={`${formatRMCompact(summary.poolCommitted)} on committed revenue`}
          onClick={() => openDrillDown(mecDerivedDrill(data, "pool"))}
        />
        <Figure
          heading="Profit after tax"
          figure={formatRMCompact(summary.patReceived)}
          unit="at a 10% margin"
          detail={`${formatRMCompact(summary.patCommitted)} on committed revenue`}
          onClick={() => openDrillDown(mecDerivedDrill(data, "pat"))}
        />
      </div>

      <div className="border-t border-line px-5 py-4">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.09em] text-ink-subtle">
          Per-staff economics
        </p>

        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-ink-muted">Revenue per staff</dt>
            <dd className="tnum mt-0.5 font-display text-lg font-bold text-ink">
              {formatRMCompact(perStaff.band.min)} – {formatRMCompact(perStaff.band.max)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">PAT per staff</dt>
            <dd className="tnum mt-0.5 font-display text-lg font-bold text-ink">
              {formatRMCompact(perStaff.patBand.min)} –{" "}
              {formatRMCompact(perStaff.patBand.max)}
            </dd>
          </div>
        </dl>

        {perStaff.headcount > 0 && perStaff.revenuePerStaff !== null ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 py-2.5">
            <span className="text-xs text-ink-muted">
              {perStaff.headcount} staff carrying{" "}
              <span className="tnum font-semibold text-ink">
                {formatRM(perStaff.revenuePerStaff)}
              </span>{" "}
              each
            </span>
            <Badge tone={perStaff.withinBand ? "received" : "risk"} dot>
              {perStaff.withinBand ? "within band" : "outside band"}
            </Badge>
          </div>
        ) : (
          <p className="mt-3 rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-[0.6875rem] leading-relaxed text-ink-muted">
            Headcount is not declared yet. At this band, the{" "}
            <span className="tnum font-medium text-ink">
              {formatRM(summary.target)}
            </span>{" "}
            annual target implies{" "}
            <span className="tnum font-semibold text-ink">
              {perStaff.impliedStaffAtMax}–{perStaff.impliedStaffAtMin}
            </span>{" "}
            people. Set <code className="text-[0.625rem]">MEC_HEADCOUNT</code> in{" "}
            <code className="text-[0.625rem]">lib/constants.ts</code> to compare
            against the actual team.
          </p>
        )}

        <p className="mt-3 text-[0.6875rem] leading-relaxed text-ink-subtle">
          {MEC_COUNTS_TOWARD_RAISE
            ? "MEC revenue feeds the RM20,000,000 raise."
            : "MEC revenue is tracked separately and contributes RM0 to the RM20,000,000 raise. PAT here is an estimate from the margin, not an accounted figure."}
        </p>
      </div>
    </Card>
  );
}

function Figure({
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
