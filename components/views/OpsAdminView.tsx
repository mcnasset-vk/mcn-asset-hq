"use client";

import { useState } from "react";

import { KpiCard } from "@/components/dashboard/KpiCard";
import { DeliverableForm } from "@/components/forms/DeliverableForm";
import { LifestyleInvoiceForm } from "@/components/forms/LifestyleInvoiceForm";
import { OpsSyncForm } from "@/components/forms/OpsSyncForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { useDashboard } from "@/components/providers/DashboardProvider";
import { Badge, TONE_DOT } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { formatDate, formatRM } from "@/lib/format";
import { getDeliverableSummary } from "@/lib/metrics";
import { BUSINESS_LINE_LABELS } from "@/lib/types";
import type { Deliverable, LifestyleInvoice, OpsSyncLog } from "@/lib/types";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * The Ops Admin Associate's desk.
 *
 * Compensation is deliverable-based, so the monthly fee is an aggregate of
 * logged work rather than a fixed figure. Nothing here is revenue — it is what
 * MEC owes a contractor.
 */
export function OpsAdminView() {
  const { data, profile, now } = useDashboard();

  const [year, setYear] = useState(() => Number(now.slice(0, 4)));
  const [month, setMonth] = useState(() => Number(now.slice(5, 7)));

  const [editingDeliverable, setEditingDeliverable] = useState<
    Deliverable | null | undefined
  >(undefined);
  const [editingSync, setEditingSync] = useState<OpsSyncLog | null | undefined>(
    undefined,
  );
  const [editingInvoice, setEditingInvoice] = useState<
    LifestyleInvoice | null | undefined
  >(undefined);

  const summary = getDeliverableSummary(data, year, month, profile.id);

  return (
    <>
      <PageHeader
        eyebrow={
          profile.businessLine
            ? BUSINESS_LINE_LABELS[profile.businessLine]
            : "Ops Admin Associate"
        }
        title={profile.fullName || "Ops Admin Associate"}
        description="Deliverable-based fees. Log each completed output against the rate card and the monthly invoice total is calculated for you. Every entry is timestamped and attributed."
        action={
          <button
            type="button"
            onClick={() => setEditingDeliverable(null)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover"
          >
            Log deliverable
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={`${MONTHS[month - 1]} earnings`}
          value={formatRM(summary.totalFee)}
          detail={`${summary.totalCount} deliverables logged`}
          tone="received"
          onClick={() => setEditingDeliverable(null)}
        />
        <KpiCard
          label="Not yet invoiced"
          value={formatRM(summary.unbilledFee)}
          detail={
            summary.invoicedFee > 0
              ? `${formatRM(summary.invoicedFee)} already billed`
              : "Nothing billed for this month yet"
          }
          tone={summary.unbilledFee > 0 ? "committed" : "idle"}
          onClick={() => setEditingInvoice(null)}
        />
        <KpiCard
          label="CEC profiles"
          value={`${summary.cecProfileCount} / ${summary.cecProfileTarget}`}
          detail="Against the one-per-week target"
          tone={
            summary.cecProfileCount >= summary.cecProfileTarget
              ? "received"
              : "risk"
          }
          onClick={() => setEditingDeliverable(null)}
        />
        <KpiCard
          label="Sync notes"
          value={String(data.syncLogs.length)}
          detail="Weekly updates with the Operations Manager"
          tone="accent"
          onClick={() => setEditingSync(null)}
        />
      </div>

      <div className="mt-4">
        <Card>
          <CardHeader
            title="Monthly Deliverable Summary"
            hint="Tallied against the rate card — this is what the invoice is worth"
            action={
              <div className="flex gap-2">
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  aria-label="Billing month"
                  className="rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-xs text-ink focus:border-accent focus:outline-none"
                >
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  aria-label="Billing year"
                  className="rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-xs text-ink focus:border-accent focus:outline-none"
                >
                  {[2026, 2027, 2028].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            }
          />

          <div className="grid gap-px bg-line sm:grid-cols-2 xl:grid-cols-4">
            {summary.breakdown.map((row) => (
              <div key={row.key} className="bg-surface px-5 py-4">
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className={cn("size-2.5 rounded-sm", TONE_DOT[row.tone])}
                  />
                  <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
                    {row.label}
                  </span>
                </span>
                <span className="tnum mt-2 block font-display text-2xl font-bold tracking-tight text-ink">
                  {formatRM(row.fee)}
                </span>
                <span className="mt-0.5 block text-sm text-ink-muted">
                  {row.count} × {formatRM(row.currentRate)} per {row.unit}
                </span>
              </div>
            ))}
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4">
            <p className="text-xs leading-relaxed text-ink-muted">
              Totals sum the rate agreed on each deliverable, not today&apos;s
              rate card, so renegotiating a rate never restates a past month.
            </p>
            <span className="tnum font-display text-2xl font-bold text-ink">
              {formatRM(summary.totalFee)}
            </span>
          </footer>
        </Card>
      </div>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-2">
        <DeliverableListPanel
          summary={summary}
          onAdd={() => setEditingDeliverable(null)}
          onEdit={setEditingDeliverable}
        />
        <SyncPanel onAdd={() => setEditingSync(null)} onEdit={setEditingSync} />
      </div>

      <div className="mt-4">
        <InvoicePanel onAdd={() => setEditingInvoice(null)} onEdit={setEditingInvoice} />
      </div>

      <DeliverableForm
        open={editingDeliverable !== undefined}
        onClose={() => setEditingDeliverable(undefined)}
        deliverable={editingDeliverable}
      />
      <OpsSyncForm
        open={editingSync !== undefined}
        onClose={() => setEditingSync(undefined)}
        log={editingSync}
      />
      <LifestyleInvoiceForm
        open={editingInvoice !== undefined}
        onClose={() => setEditingInvoice(undefined)}
        invoice={editingInvoice}
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */

function DeliverableListPanel({
  summary,
  onAdd,
  onEdit,
}: {
  summary: ReturnType<typeof getDeliverableSummary>;
  onAdd: () => void;
  onEdit: (d: Deliverable) => void;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Deliverables This Month"
        hint={`${MONTHS[summary.month - 1]} ${summary.year}`}
        action={
          <button
            type="button"
            onClick={onAdd}
            className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-ink-muted transition hover:border-accent-line hover:text-accent"
          >
            Log deliverable
          </button>
        }
      />
      <div className="p-5">
        {summary.items.length === 0 ? (
          <p className="text-sm text-ink-muted">
            Nothing logged for this month yet.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {summary.items.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => onEdit(d)}
                  className="flex w-full items-center gap-3 py-2.5 text-left transition hover:text-accent"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">
                      {d.title}
                    </span>
                    <span className="block text-[0.6875rem] text-ink-subtle">
                      {formatDate(d.occurredOn)}
                    </span>
                  </span>
                  <span className="tnum shrink-0 text-sm font-semibold text-ink">
                    {formatRM(d.rateApplied)}
                  </span>
                  {d.invoiceId ? (
                    <Badge tone="received">billed</Badge>
                  ) : (
                    <Badge tone="idle">unbilled</Badge>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function SyncPanel({
  onAdd,
  onEdit,
}: {
  onAdd: () => void;
  onEdit: (l: OpsSyncLog) => void;
}) {
  const { data } = useDashboard();

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Operations Manager Sync"
        hint="Handovers received and the weekly status note"
        action={
          <button
            type="button"
            onClick={onAdd}
            className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-ink-muted transition hover:border-accent-line hover:text-accent"
          >
            Add note
          </button>
        }
      />
      <div className="p-5">
        {data.syncLogs.length === 0 ? (
          <p className="text-sm text-ink-muted">
            No sync notes yet. Log handovers as they arrive from the Operations
            Manager.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {[...data.syncLogs].reverse().map((log) => (
              <li key={log.id}>
                <button
                  type="button"
                  onClick={() => onEdit(log)}
                  className="w-full py-2.5 text-left transition hover:text-accent"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-ink">
                      Week of {formatDate(log.weekOf)}
                    </span>
                    <Badge tone="idle">{log.handoffType}</Badge>
                  </span>
                  {log.statusNote ? (
                    <span className="mt-0.5 block line-clamp-2 text-[0.6875rem] text-ink-subtle">
                      {log.statusNote}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function InvoicePanel({
  onAdd,
  onEdit,
}: {
  onAdd: () => void;
  onEdit: (i: LifestyleInvoice) => void;
}) {
  const { data } = useDashboard();

  return (
    <Card>
      <CardHeader
        title="Invoices"
        hint="Raise one per billing month once the deliverables are logged"
        action={
          <button
            type="button"
            onClick={onAdd}
            className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-ink-muted transition hover:border-accent-line hover:text-accent"
          >
            New invoice
          </button>
        }
      />
      <div className="p-5">
        {data.invoices.length === 0 ? (
          <p className="text-sm text-ink-muted">
            No invoices raised yet. The monthly summary above shows what the
            current month is worth.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {data.invoices.map((inv) => (
              <li key={inv.id}>
                <button
                  type="button"
                  onClick={() => onEdit(inv)}
                  className="flex w-full items-center gap-3 py-2.5 text-left transition hover:text-accent"
                >
                  <span className="min-w-0 flex-1 text-sm font-medium text-ink">
                    {MONTHS[inv.periodMonth - 1]} {inv.periodYear}
                  </span>
                  <span className="tnum shrink-0 text-sm text-ink">
                    {formatRM(inv.amount)}
                  </span>
                  <Badge tone={inv.status === "submitted" ? "received" : "idle"}>
                    {inv.status === "submitted"
                      ? "submitted"
                      : "pending verification"}
                  </Badge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
