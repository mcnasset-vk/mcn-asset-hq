"use client";

import { CommissionPanel } from "@/components/dashboard/CommissionPanel";
import { useDashboard } from "@/components/providers/DashboardProvider";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { useTransition } from "react";

import { setCommissionPaid } from "@/app/(dashboard)/actions";
import { useDrillDown } from "@/components/drilldown/DrillDownProvider";
import { RecordsCard } from "@/components/drilldown/RecordsCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { commissionDrill } from "@/lib/drilldowns";
import { formatRM } from "@/lib/format";
import { getCommissionSummary } from "@/lib/metrics";

export function CommissionsView() {
  const { openDrillDown } = useDrillDown();
  const { data, now } = useDashboard();
  const [, startTransition] = useTransition();

  // Settling a line is one click; the ledger refreshes from the server after.
  const togglePaid = {
    label: (row: { statusLabel: string }) =>
      row.statusLabel === "Paid" ? "Mark unpaid" : "Mark paid",
    run: (row: { id: string; statusLabel: string }) => {
      const paid = row.statusLabel !== "Paid";
      startTransition(() => {
        void setCommissionPaid(row.id, paid);
      });
    },
  };
  const summary = getCommissionSummary(data, now);

  return (
    <>
      <PageHeader
        eyebrow="Liabilities"
        title="Introducer Commissions"
        description="RM5,000 becomes payable when a factory's RM4,000,000 facility is disbursed, and a further RM5,000 when the RM1,000,000 reaches MCN Asset HQ. This is money owed, not money earned."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Outstanding"
          value={formatRM(summary.accrued)}
          detail={`${summary.accruedCount} lines payable`}
          tone="risk"
          onClick={() => openDrillDown(commissionDrill(data, "accrued", now))}
        />
        <KpiCard
          label="Overdue"
          value={formatRM(summary.overdueAmount)}
          detail={
            summary.overdue.length > 0
              ? `${summary.overdue.length} lines past their due date`
              : "Nothing past due"
          }
          tone={summary.overdue.length > 0 ? "stalled" : "idle"}
          onClick={() => openDrillDown(commissionDrill(data, "overdue", now))}
        />
        <KpiCard
          label="Paid to date"
          value={formatRM(summary.paid)}
          detail={`${summary.paidCount} lines settled`}
          tone="received"
          onClick={() => openDrillDown(commissionDrill(data, "paid", now))}
        />
        <KpiCard
          label="Lifetime generated"
          value={formatRM(summary.lifetime)}
          detail={`Across ${summary.byIntroducer.length} introducers`}
          tone="accent"
          onClick={() => openDrillDown(commissionDrill(data, "all", now))}
        />
      </div>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-2">
        <CommissionPanel summary={summary} />
        <RecordsCard
          height="h-[32rem]"
          content={commissionDrill(data, "accrued", now)}
        />
      </div>

      <div className="mt-4">
        <RecordsCard
          content={{
            ...commissionDrill(data, "all", now),
            title: "All Commission Lines",
            subtitle:
              "Search by introducer, factory or phone number. Export to CSV for the payment run.",
            rowAction: togglePaid,
          }}
        />
      </div>
    </>
  );
}
