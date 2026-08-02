"use client";

import { CapitalTrend } from "@/components/dashboard/CapitalTrend";
import { useDashboard } from "@/components/providers/DashboardProvider";
import { CommissionPanel } from "@/components/dashboard/CommissionPanel";
import { FactoryFunnel } from "@/components/dashboard/FactoryFunnel";
import { FundraisingHero } from "@/components/dashboard/FundraisingHero";
import { GapCloser } from "@/components/dashboard/GapCloser";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { MdnaPanel } from "@/components/dashboard/MdnaPanel";
import { NasdaqPanel } from "@/components/dashboard/NasdaqPanel";
import { useDrillDown } from "@/components/drilldown/DrillDownProvider";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  activeDealsDrill,
  commissionDrill,
  committedDrill,
  inFlightDrill,
  receivedDrill,
} from "@/lib/drilldowns";
import { formatDate, formatRM } from "@/lib/format";
import {
  getCapitalSummary,
  getCapitalTrend,
  getCommissionSummary,
  getFactoryStages,
  getGapCloser,
  getMdnaBuckets,
  getMdnaSummary,
  getNasdaqSummary,
  getPace,
  getStalledFactories,
} from "@/lib/metrics";

export function ExecutiveView() {
  const { openDrillDown } = useDrillDown();
  const { data, now } = useDashboard();

  const capital = getCapitalSummary(data, now);
  const pace = getPace(now, capital);
  const gap = getGapCloser(capital);
  const stages = getFactoryStages(data, now);
  const stalled = getStalledFactories(data, now);
  const mdnaBuckets = getMdnaBuckets(data);
  const mdnaSummary = getMdnaSummary(data);
  const nasdaq = getNasdaqSummary(data);
  const commissions = getCommissionSummary(data, now);
  const trend = getCapitalTrend(data, now);

  const openDeals =
    stages
      .filter((s) => s.key !== "invested")
      .reduce((total, s) => total + s.count, 0) +
    mdnaBuckets
      .filter((b) => b.key !== "invested")
      .reduce((total, b) => total + b.count, 0) +
    nasdaq.buckets
      .filter((b) => b.key !== "onboarded")
      .reduce((total, b) => total + b.count, 0);

  return (
    <>
      <PageHeader
        eyebrow="Executive Overview"
        title="MCN Asset HQ"
        description={
          <>
            Every figure below is clickable — open any card, stage or chart
            segment to see the companies, contacts and documents behind it.
            Target closes {formatDate(capital.deadline)}.
          </>
        }
      />

      <FundraisingHero capital={capital} pace={pace} />

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Capital received"
          value={formatRM(capital.received)}
          detail="Banked by MCN Asset HQ"
          tone="received"
          onClick={() => openDrillDown(receivedDrill(data, now))}
        />
        <KpiCard
          label="Capital committed"
          value={formatRM(capital.committed)}
          detail={`${formatRM(capital.inFlight)} still in flight`}
          tone="committed"
          onClick={() => openDrillDown(committedDrill(data, now))}
        />
        <KpiCard
          label="Open pipeline"
          value={String(openDeals)}
          detail="Records not yet completed, all modules"
          tone="idle"
          onClick={() => openDrillDown(activeDealsDrill(data, now))}
        />
        <KpiCard
          label="Commissions owed"
          value={formatRM(commissions.accrued)}
          detail={
            commissions.overdue.length > 0
              ? `${commissions.overdue.length} lines overdue`
              : `${commissions.accruedCount} lines payable`
          }
          tone={commissions.overdue.length > 0 ? "stalled" : "risk"}
          onClick={() => openDrillDown(commissionDrill(data, "accrued", now))}
        />
      </div>

      <div className="mt-4">
        <CapitalTrend points={trend} />
      </div>

      <div className="mt-4">
        <GapCloser gap={gap} capital={capital} />
      </div>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-2">
        <FactoryFunnel stages={stages} stalledCount={stalled.length} />
        <MdnaPanel buckets={mdnaBuckets} summary={mdnaSummary} />
        <NasdaqPanel summary={nasdaq} />
        <CommissionPanel summary={commissions} />
      </div>

      <button
        type="button"
        onClick={() => openDrillDown(inFlightDrill(data, now))}
        className="mt-4 flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-surface px-5 py-4 text-left shadow-sm transition hover:border-accent-line"
      >
        <span>
          <span className="block text-sm font-semibold text-ink">
            {formatRM(capital.inFlight)} is committed but not yet in the bank
          </span>
          <span className="mt-0.5 block text-xs text-ink-muted">
            Chasing these transfers is the fastest way to move the headline
            number — no new deals required.
          </span>
        </span>
        <span className="shrink-0 text-xs font-medium text-accent">
          Review →
        </span>
      </button>
    </>
  );
}
