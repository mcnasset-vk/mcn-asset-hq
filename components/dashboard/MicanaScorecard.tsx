"use client";

import { useDrillDown } from "@/components/drilldown/DrillDownProvider";
import { useDashboard } from "@/components/providers/DashboardProvider";
import { Card, CardHeader } from "@/components/ui/Card";
import { IconChevronRight } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import {
  airconDrill,
  allBungalowsDrill,
  micanaPayoutDrill,
  micanaTenantDrill,
} from "@/lib/drilldowns";
import { formatPercent, formatRM } from "@/lib/format";
import type { MicanaScorecard as Scorecard } from "@/lib/metrics";

/**
 * Micana's headline, and the module's answer to NasdaqPanel.
 *
 * It deliberately has its own figures rather than a share of the RM20M bar:
 * this is trading profit from an operating business, not capital raised, and
 * adding the two would overstate the raise.
 */
export function MicanaScorecard({ scorecard }: { scorecard: Scorecard }) {
  const { openDrillDown } = useDrillDown();
  const { data, now } = useDashboard();

  const cells: {
    label: string;
    value: string;
    detail: string;
    tone?: string;
    onClick: () => void;
  }[] = [
    {
      label: "Gross revenue",
      value: formatRM(scorecard.grossRevenue),
      detail: `${scorecard.monthsLedgered} ${scorecard.monthsLedgered === 1 ? "month" : "months"} ledgered`,
      onClick: () => openDrillDown(micanaPayoutDrill(data, "all", now)),
    },
    {
      label: "Operating cost",
      value: formatRM(scorecard.opex),
      detail: "Utilities, upkeep, management",
      onClick: () => openDrillDown(micanaPayoutDrill(data, "all", now)),
    },
    {
      label: "Net profit",
      value: formatRM(scorecard.netProfit),
      detail: "Gross revenue less operating cost",
      tone: scorecard.netProfit >= 0 ? "text-received" : "text-stalled",
      onClick: () => openDrillDown(micanaPayoutDrill(data, "all", now)),
    },
    {
      label: "Owner share",
      value: formatRM(scorecard.ownerShare),
      detail: "Owed to bungalow owners",
      tone: "text-risk",
      onClick: () => openDrillDown(micanaPayoutDrill(data, "all", now)),
    },
    {
      label: "Micana retained",
      value: formatRM(scorecard.micanaRetained),
      detail: "What the business keeps",
      tone: scorecard.micanaRetained >= 0 ? "text-received" : "text-stalled",
      onClick: () => openDrillDown(micanaPayoutDrill(data, "all", now)),
    },
    {
      label: "Aircon billed on",
      value: formatRM(scorecard.airconBilled),
      detail: "Usage above the included allowance",
      onClick: () => openDrillDown(airconDrill(data, "billable")),
    },
  ];

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Micana Operating Scorecard"
        hint="Co-living trading performance across every bungalow, all months to date"
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

      <div className="grid grid-cols-2 divide-x divide-y divide-line border-b border-line sm:grid-cols-3">
        {cells.map((cell) => (
          <button
            key={cell.label}
            type="button"
            onClick={cell.onClick}
            className="px-5 py-4 text-left transition hover:bg-surface-2"
          >
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
              {cell.label}
            </p>
            <p
              className={cn(
                "tnum mt-1.5 font-display text-xl font-bold text-ink",
                cell.tone,
              )}
            >
              {cell.value}
            </p>
            <p className="mt-0.5 text-[0.6875rem] text-ink-muted">
              {cell.detail}
            </p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 divide-y divide-line border-b border-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <button
          type="button"
          onClick={() => openDrillDown(micanaTenantDrill(data, "occupying"))}
          className="px-5 py-3 text-left transition hover:bg-surface-2"
        >
          <p className="text-xs text-ink-muted">
            Occupancy{" "}
            <span className="tnum font-semibold text-ink">
              {formatPercent(scorecard.occupancyPct)}
            </span>
          </p>
        </button>
        <button
          type="button"
          onClick={() => openDrillDown(micanaTenantDrill(data, "occupying"))}
          className="px-5 py-3 text-left transition hover:bg-surface-2"
        >
          <p className="text-xs text-ink-muted">
            Rent roll{" "}
            <span className="tnum font-semibold text-ink">
              {formatRM(scorecard.monthlyRentRoll)}
            </span>{" "}
            / month
          </p>
        </button>
        <button
          type="button"
          onClick={() => openDrillDown(allBungalowsDrill(data, now))}
          className="px-5 py-3 text-left transition hover:bg-surface-2"
        >
          <p className="text-xs text-ink-muted">
            Renovation to date{" "}
            <span className="tnum font-semibold text-ink">
              {formatRM(scorecard.capexToDate)}
            </span>
          </p>
        </button>
      </div>

      <div className="p-5">
        <p className="rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-[0.6875rem] leading-relaxed text-ink-muted">
          These are Micana&rsquo;s own operating figures —{" "}
          <span className="tnum font-medium text-ink">
            {scorecard.bungalowsOperating}
          </span>{" "}
          of {scorecard.bungalowsSourced} bungalows sourced are operating
          {scorecard.bungalowsExited > 0
            ? `, ${scorecard.bungalowsExited} since exited`
            : ""}
          . They are trading profit, not capital raised, and are never counted
          toward the RM20,000,000 target.
        </p>
      </div>
    </Card>
  );
}
