"use client";

import { useDrillDown } from "@/components/drilldown/DrillDownProvider";
import { useDashboard } from "@/components/providers/DashboardProvider";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { IconChevronRight, IconWarning } from "@/components/ui/icons";
import { micanaPayoutDrill, ownerPayoutDrill } from "@/lib/drilldowns";
import { formatRM } from "@/lib/format";
import type { MicanaPayoutSummary } from "@/lib/metrics";

/**
 * Profit sharing with bungalow owners — a liability, like the introducer
 * commissions, so accrued and paid are kept apart. The outstanding figure is
 * what Micana still owes its owners.
 */
export function MicanaPayoutPanel({
  summary,
}: {
  summary: MicanaPayoutSummary;
}) {
  const { openDrillDown } = useDrillDown();
  const { data, now } = useDashboard();

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Owner Profit Share"
        hint="Each bungalow's monthly net profit, split with its owner at the agreed percentage"
        action={
          <button
            type="button"
            onClick={() => openDrillDown(micanaPayoutDrill(data, "all", now))}
            className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-ink-muted transition hover:border-accent-line hover:text-accent"
          >
            All months
            <IconChevronRight className="size-3.5" />
          </button>
        }
      />

      {summary.overdue.length > 0 ? (
        <button
          type="button"
          onClick={() => openDrillDown(micanaPayoutDrill(data, "overdue", now))}
          className="flex w-full items-center gap-2.5 border-b border-stalled-line bg-stalled-soft px-5 py-2.5 text-left transition hover:brightness-[0.98]"
        >
          <IconWarning className="size-4 shrink-0 text-stalled" />
          <span className="flex-1 text-xs text-stalled">
            <strong className="tnum font-semibold">
              {formatRM(summary.overdueAmount)}
            </strong>{" "}
            overdue to owners across {summary.overdue.length}{" "}
            {summary.overdue.length === 1 ? "month" : "months"}
          </span>
          <IconChevronRight className="size-4 shrink-0 text-stalled" />
        </button>
      ) : null}

      <div className="grid grid-cols-2 divide-x divide-line border-b border-line">
        <button
          type="button"
          onClick={() => openDrillDown(micanaPayoutDrill(data, "accrued", now))}
          className="px-5 py-4 text-left transition hover:bg-surface-2"
        >
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
            Outstanding
          </p>
          <p className="tnum mt-1.5 font-display text-2xl font-bold text-risk">
            {formatRM(summary.accrued)}
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {summary.accruedCount} months payable
          </p>
        </button>
        <button
          type="button"
          onClick={() => openDrillDown(micanaPayoutDrill(data, "paid", now))}
          className="px-5 py-4 text-left transition hover:bg-surface-2"
        >
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
            Paid to date
          </p>
          <p className="tnum mt-1.5 font-display text-2xl font-bold text-received">
            {formatRM(summary.paid)}
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {summary.paidCount} months settled
          </p>
        </button>
      </div>

      {summary.byOwner.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-ink-muted">
          No profit share ledgered yet.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {summary.byOwner.map((owner) => (
            <li key={owner.name}>
              <button
                type="button"
                onClick={() => openDrillDown(ownerPayoutDrill(data, owner.name, now))}
                className="flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-surface-2"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">
                    {owner.name || "—"}
                  </span>
                  <span className="tnum block truncate text-[0.6875rem] text-ink-subtle">
                    {owner.phone} · {owner.bungalowName} · {owner.count}{" "}
                    {owner.count === 1 ? "month" : "months"}
                  </span>
                </span>
                {owner.accrued > 0 ? (
                  <Badge tone="risk">{formatRM(owner.accrued)} due</Badge>
                ) : (
                  <Badge tone="received">Settled</Badge>
                )}
                <IconChevronRight className="size-4 shrink-0 text-ink-subtle" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <footer className="border-t border-line px-5 py-3">
        <p className="text-xs text-ink-muted">
          Lifetime profit share generated:{" "}
          <span className="tnum font-semibold text-ink">
            {formatRM(summary.lifetime)}
          </span>
          . The split is computed in the database from each bungalow&rsquo;s
          agreed percentage — a loss month pays the owner nothing.
        </p>
      </footer>
    </Card>
  );
}
