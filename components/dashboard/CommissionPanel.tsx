"use client";

import { useDrillDown } from "@/components/drilldown/DrillDownProvider";
import { useDashboard } from "@/components/providers/DashboardProvider";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { IconChevronRight, IconWarning } from "@/components/ui/icons";
import { commissionDrill, introducerDrill } from "@/lib/drilldowns";
import { formatRM } from "@/lib/format";
import type { CommissionSummary } from "@/lib/metrics";

/**
 * Introducer commissions are a liability, so accrued and paid are shown
 * separately — the outstanding figure is what MCN Asset HQ still owes.
 */
export function CommissionPanel({ summary }: { summary: CommissionSummary }) {
  const { openDrillDown } = useDrillDown();
  const { data, now } = useDashboard();

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Introducer Commissions"
        hint="RM5,000 on disbursement + RM5,000 on the investment into HQ"
        action={
          <button
            type="button"
            onClick={() => openDrillDown(commissionDrill(data, "all", now))}
            className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-ink-muted transition hover:border-accent-line hover:text-accent"
          >
            All lines
            <IconChevronRight className="size-3.5" />
          </button>
        }
      />

      {summary.overdue.length > 0 ? (
        <button
          type="button"
          onClick={() => openDrillDown(commissionDrill(data, "overdue", now))}
          className="flex w-full items-center gap-2.5 border-b border-stalled-line bg-stalled-soft px-5 py-2.5 text-left transition hover:brightness-[0.98]"
        >
          <IconWarning className="size-4 shrink-0 text-stalled" />
          <span className="flex-1 text-xs text-stalled">
            <strong className="font-semibold tnum">
              {formatRM(summary.overdueAmount)}
            </strong>{" "}
            overdue across {summary.overdue.length} commission{" "}
            {summary.overdue.length === 1 ? "line" : "lines"}
          </span>
          <IconChevronRight className="size-4 shrink-0 text-stalled" />
        </button>
      ) : null}

      <div className="grid grid-cols-2 divide-x divide-line border-b border-line">
        <button
          type="button"
          onClick={() => openDrillDown(commissionDrill(data, "accrued", now))}
          className="px-5 py-4 text-left transition hover:bg-surface-2"
        >
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
            Outstanding
          </p>
          <p className="tnum mt-1.5 font-display text-2xl font-bold text-risk">
            {formatRM(summary.accrued)}
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {summary.accruedCount} lines payable
          </p>
        </button>
        <button
          type="button"
          onClick={() => openDrillDown(commissionDrill(data, "paid", now))}
          className="px-5 py-4 text-left transition hover:bg-surface-2"
        >
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
            Paid to date
          </p>
          <p className="tnum mt-1.5 font-display text-2xl font-bold text-received">
            {formatRM(summary.paid)}
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {summary.paidCount} lines settled
          </p>
        </button>
      </div>

      <ul className="divide-y divide-line">
        {summary.byIntroducer.map((introducer) => (
          <li key={introducer.name}>
            <button
              type="button"
              onClick={() => openDrillDown(introducerDrill(data, introducer.name, now))}
              className="flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-surface-2"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink">
                  {introducer.name}
                </span>
                <span className="tnum block text-[0.6875rem] text-ink-subtle">
                  {introducer.phone} · {introducer.count} lines
                </span>
              </span>
              {introducer.accrued > 0 ? (
                <Badge tone="risk">{formatRM(introducer.accrued)} due</Badge>
              ) : (
                <Badge tone="received">Settled</Badge>
              )}
              <IconChevronRight className="size-4 shrink-0 text-ink-subtle" />
            </button>
          </li>
        ))}
      </ul>

      <footer className="border-t border-line px-5 py-3">
        <p className="text-xs text-ink-muted">
          Lifetime commission generated:{" "}
          <span className="tnum font-semibold text-ink">
            {formatRM(summary.lifetime)}
          </span>
        </p>
      </footer>
    </Card>
  );
}
