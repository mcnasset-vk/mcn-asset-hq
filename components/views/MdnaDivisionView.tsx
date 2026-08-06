"use client";

import Link from "next/link";

import { KpiCard } from "@/components/dashboard/KpiCard";
import { useDrillDown } from "@/components/drilldown/DrillDownProvider";
import { PageHeader } from "@/components/layout/PageHeader";
import { useDashboard } from "@/components/providers/DashboardProvider";
import { Card, CardHeader } from "@/components/ui/Card";
import { IconChevronRight } from "@/components/ui/icons";
import {
  allFactoriesDrill,
  allMdnaDrill,
  allNasdaqDrill,
  commissionDrill,
} from "@/lib/drilldowns";
import { formatPercent, formatRM } from "@/lib/format";
import {
  getCapitalSummary,
  getCommissionSummary,
  getMdnaSummary,
  getNasdaqSummary,
  isFactoryCommitted,
  isFactoryReceived,
} from "@/lib/metrics";

/**
 * The MDNA division at a glance — Factory Cosif, MDNA Admin, Nasdaq and Fees
 * on one screen. Sits between the Executive Overview (which also covers MEC)
 * and the individual module pages.
 *
 * Nasdaq is shown in profit-after-tax and is deliberately kept out of the
 * capital figures, exactly as on the Executive Overview.
 */
export function MdnaDivisionView() {
  const { data, now } = useDashboard();
  const { openDrillDown } = useDrillDown();

  const capital = getCapitalSummary(data, now);
  const mdna = getMdnaSummary(data);
  const nasdaq = getNasdaqSummary(data);
  const commissions = getCommissionSummary(data, now);

  const factoryReceived = data.factories
    .filter(isFactoryReceived)
    .reduce((sum, d) => sum + d.hqInvestmentAmount, 0);
  const factoryCommitted = data.factories
    .filter(isFactoryCommitted)
    .reduce((sum, d) => sum + d.hqInvestmentAmount, 0);

  /** Capital into HQ from this division only — Factory + MDNA Admin. */
  const divisionReceived = factoryReceived + mdna.hqReceived;
  const divisionCommitted = factoryCommitted + mdna.hqCommitted;

  return (
    <>
      <PageHeader
        eyebrow="Division"
        title="MDNA"
        description="Factory Cosif, MDNA Admin, Nasdaq listing and introducer fees in one view. Capital figures cover Factory and MDNA Admin only — Nasdaq is measured in profit-after-tax and never counts toward the RM20,000,000 target."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Division banked"
          value={formatRM(divisionReceived)}
          detail={`of ${formatRM(capital.received)} across the whole group`}
          tone="received"
          onClick={() => openDrillDown(allFactoriesDrill(data, now))}
        />
        <KpiCard
          label="Division committed"
          value={formatRM(divisionCommitted)}
          detail={`${formatRM(divisionCommitted - divisionReceived)} still in flight`}
          tone="committed"
          onClick={() => openDrillDown(allMdnaDrill(data))}
        />
        <KpiCard
          label="Nasdaq committed PAT"
          value={formatRM(nasdaq.committedPat)}
          detail={`${formatPercent(nasdaq.pct)} of the RM6M threshold`}
          tone="accent"
          onClick={() => openDrillDown(allNasdaqDrill(data))}
        />
        <KpiCard
          label="Fees outstanding"
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

      <Card className="mt-4">
        <CardHeader
          title="Business lines"
          hint="Open any line for its full pipeline, records and documents"
        />
        <ul className="divide-y divide-line">
          <LineRow
            href="/factory"
            name="Factory Cosif"
            summary={`${data.factories.length} factories · ${formatRM(factoryReceived)} banked into HQ`}
          />
          <LineRow
            href="/mdna/admin"
            name="MDNA Admin"
            summary={`${mdna.totalMembers} members · ${formatRM(mdna.hqReceived)} banked into HQ`}
          />
          <LineRow
            href="/nasdaq"
            name="Nasdaq M&A"
            summary={`${nasdaq.companiesAgreed} of ${nasdaq.totalCompanies} committed · ${formatRM(nasdaq.committedPat)} PAT`}
          />
          <LineRow
            href="/commissions"
            name="Fees"
            summary={`${formatRM(commissions.accrued)} outstanding · ${formatRM(commissions.paid)} paid to date`}
          />
        </ul>
      </Card>
    </>
  );
}

function LineRow({
  href,
  name,
  summary,
}: {
  href: string;
  name: string;
  summary: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-surface-2"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-ink">{name}</span>
          <span className="tnum block text-xs text-ink-muted">{summary}</span>
        </span>
        <IconChevronRight className="size-4 shrink-0 text-ink-subtle" />
      </Link>
    </li>
  );
}
