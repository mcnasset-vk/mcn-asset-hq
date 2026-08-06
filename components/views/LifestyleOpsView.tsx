"use client";

import { useActionState, useState } from "react";

import { logServiceCall, type FormState } from "@/app/(dashboard)/actions";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { CecForm } from "@/components/forms/CecForm";
import { EventMediaForm } from "@/components/forms/EventMediaForm";
import { LifestyleEventForm } from "@/components/forms/LifestyleEventForm";
import { LifestyleInvoiceForm } from "@/components/forms/LifestyleInvoiceForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { useDashboard } from "@/components/providers/DashboardProvider";
import { Badge, TONE_DOT } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { CEC_ONBOARDING_STEPS } from "@/lib/constants";
import { formatDate, formatRM } from "@/lib/format";
import { cecProgress, getLifestyleOpsSummary } from "@/lib/metrics";
import { BUSINESS_LINE_LABELS } from "@/lib/types";
import type {
  CecChampion,
  EventMedia,
  LifestyleEvent,
  LifestyleInvoice,
} from "@/lib/types";

/**
 * The MEC Lifestyle Operations Manager's desk.
 *
 * Four modules: CEC onboarding, event coordination, media handoff and the
 * monthly invoice. Nothing here is revenue — the service fee is a cost to MEC
 * and is deliberately kept out of every revenue total.
 */
export function LifestyleOpsView() {
  const { data, profile, now } = useDashboard();
  const summary = getLifestyleOpsSummary(data, now);

  const [editingCec, setEditingCec] = useState<CecChampion | null | undefined>(
    undefined,
  );
  const [editingEvent, setEditingEvent] = useState<
    LifestyleEvent | null | undefined
  >(undefined);
  const [editingMedia, setEditingMedia] = useState<
    EventMedia | null | undefined
  >(undefined);
  const [editingInvoice, setEditingInvoice] = useState<
    LifestyleInvoice | null | undefined
  >(undefined);

  return (
    <>
      <PageHeader
        eyebrow={
          profile.businessLine
            ? BUSINESS_LINE_LABELS[profile.businessLine]
            : "MEC Lifestyle Operations"
        }
        title={profile.fullName || "MEC Lifestyle Operations"}
        description="Champion onboarding, event coordination, media handoff and monthly invoicing. Every save is timestamped and attributed to you; handoffs surface on the Ops Admin Associate's queue."
        action={
          <button
            type="button"
            onClick={() => setEditingEvent(null)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover"
          >
            Log an event
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Champions onboarded"
          value={String(summary.cecComplete)}
          detail={`${summary.cecTotal} in total · ${summary.cecAwaitingHandoff.length} awaiting handoff`}
          tone={summary.cecAwaitingHandoff.length > 0 ? "risk" : "received"}
          onClick={() => setEditingCec(null)}
        />
        <KpiCard
          label="Events"
          value={String(summary.eventTotal)}
          detail={`${summary.eventsByStatus.find((s) => s.key === "on_ground")?.count ?? 0} on the ground now`}
          tone="accent"
          onClick={() => setEditingEvent(null)}
        />
        <KpiCard
          label="Media outstanding"
          value={String(summary.mediaOutstanding.length)}
          detail={`${summary.mediaHandedOff} handed to Ops Admin`}
          tone={summary.mediaOutstanding.length > 0 ? "stalled" : "received"}
          onClick={() => setEditingMedia(null)}
        />
        <KpiCard
          label="Invoiced to date"
          value={formatRM(summary.invoicedToDate)}
          detail={`${summary.invoicesSubmitted} months at ${formatRM(summary.monthlyFee)}`}
          tone="committed"
          onClick={() => setEditingInvoice(null)}
        />
      </div>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-2">
        <CecPanel onAdd={() => setEditingCec(null)} onEdit={setEditingCec} />
        <EventPanel
          summary={summary}
          onAdd={() => setEditingEvent(null)}
          onEdit={setEditingEvent}
        />
      </div>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-2">
        <MediaPanel
          summary={summary}
          onAdd={() => setEditingMedia(null)}
          onEdit={setEditingMedia}
        />
        <InvoicePanel onAdd={() => setEditingInvoice(null)} onEdit={setEditingInvoice} />
      </div>

      <div className="mt-4">
        <ServiceCallCard />
      </div>

      <CecForm
        open={editingCec !== undefined}
        onClose={() => setEditingCec(undefined)}
        cec={editingCec}
      />
      <LifestyleEventForm
        open={editingEvent !== undefined}
        onClose={() => setEditingEvent(undefined)}
        event={editingEvent}
      />
      <EventMediaForm
        open={editingMedia !== undefined}
        onClose={() => setEditingMedia(undefined)}
        media={editingMedia}
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

function CecPanel({
  onAdd,
  onEdit,
}: {
  onAdd: () => void;
  onEdit: (c: CecChampion) => void;
}) {
  const { data } = useDashboard();

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Community Engagement Champions"
        hint="Intake, orientation and handoff for the Facebook upload"
        action={
          <button
            type="button"
            onClick={onAdd}
            className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-ink-muted transition hover:border-accent-line hover:text-accent"
          >
            Onboard CEC
          </button>
        }
      />
      <div className="p-5">
        {data.cecs.length === 0 ? (
          <p className="text-sm text-ink-muted">
            No champions onboarded yet. The four-step checklist starts with the
            introductory briefing.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {data.cecs.map((cec) => {
              const progress = cecProgress(cec);
              return (
                <li key={cec.id}>
                  <button
                    type="button"
                    onClick={() => onEdit(cec)}
                    className="w-full py-3 text-left transition hover:text-accent"
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="min-w-0 flex-1 text-sm font-medium text-ink">
                        {cec.name}
                      </span>
                      {progress.complete ? (
                        <Badge tone="received" dot>
                          onboarded
                        </Badge>
                      ) : cec.profileSecured && !cec.handedToAdmin ? (
                        <Badge tone="risk" dot>
                          awaiting handoff
                        </Badge>
                      ) : (
                        <span className="tnum shrink-0 text-xs text-ink-muted">
                          {progress.done}/{progress.total}
                        </span>
                      )}
                    </span>
                    <span className="mt-1.5 flex gap-1">
                      {CEC_ONBOARDING_STEPS.map((step) => (
                        <span
                          key={step.key}
                          title={step.label}
                          aria-hidden
                          className={cn(
                            "h-1.5 flex-1 rounded-full",
                            cec[step.key] ? "bg-received" : "bg-surface-3",
                          )}
                        />
                      ))}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}

function EventPanel({
  summary,
  onAdd,
  onEdit,
}: {
  summary: ReturnType<typeof getLifestyleOpsSummary>;
  onAdd: () => void;
  onEdit: (e: LifestyleEvent) => void;
}) {
  const { data } = useDashboard();

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Event Coordination"
        hint="Planning through to on-ground delivery"
        action={
          <button
            type="button"
            onClick={onAdd}
            className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-ink-muted transition hover:border-accent-line hover:text-accent"
          >
            Log event
          </button>
        }
      />
      <div className="p-5">
        <div className="flex flex-wrap gap-2">
          {summary.eventsByStatus.map((s) => (
            <Badge key={s.key} tone={s.tone} dot>
              {s.label} · {s.count}
            </Badge>
          ))}
        </div>

        {data.events.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">
            No events logged yet.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {data.events.map((event) => {
              const lead = data.cecs.find((c) => c.id === event.leadCecId);
              return (
                <li key={event.id}>
                  <button
                    type="button"
                    onClick={() => onEdit(event)}
                    className="w-full py-2.5 text-left transition hover:text-accent"
                  >
                    <span className="block text-sm font-medium text-ink">
                      {event.name}
                    </span>
                    <span className="block text-[0.6875rem] text-ink-subtle">
                      {formatDate(event.eventDate)}
                      {event.location ? ` · ${event.location}` : ""}
                      {lead ? ` · lead ${lead.name}` : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}

function MediaPanel({
  summary,
  onAdd,
  onEdit,
}: {
  summary: ReturnType<typeof getLifestyleOpsSummary>;
  onAdd: () => void;
  onEdit: (m: EventMedia) => void;
}) {
  const { data } = useDashboard();

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Media & Handoff"
        hint="Capture, then transfer to the Ops Admin Associate"
        action={
          <button
            type="button"
            onClick={onAdd}
            className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-ink-muted transition hover:border-accent-line hover:text-accent"
          >
            Log media
          </button>
        }
      />
      <div className="p-5">
        {summary.mediaOutstanding.length > 0 ? (
          <p className="mb-3 rounded-lg border border-stalled-line bg-stalled-soft px-3 py-2.5 text-xs text-stalled">
            {summary.mediaOutstanding.length} completed{" "}
            {summary.mediaOutstanding.length === 1 ? "event has" : "events have"}{" "}
            no media handed off yet.
          </p>
        ) : null}

        {data.media.length === 0 ? (
          <p className="text-sm text-ink-muted">No media logged yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {data.media.map((m) => {
              const event = data.events.find((e) => e.id === m.eventId);
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => onEdit(m)}
                    className="flex w-full items-center gap-3 py-2.5 text-left transition hover:text-accent"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-ink">
                        {event?.name ?? "Unlinked event"}
                      </span>
                      <span className="block text-[0.6875rem] text-ink-subtle">
                        {[m.hasPhotos && "photos", m.hasVideos && "videos"]
                          .filter(Boolean)
                          .join(" + ") || "nothing captured"}
                      </span>
                    </span>
                    <Badge tone={m.handedOff ? "received" : "risk"} dot>
                      {m.handedOff ? "handed off" : "pending"}
                    </Badge>
                  </button>
                </li>
              );
            })}
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
    <Card className="flex flex-col">
      <CardHeader
        title="Monthly Invoicing"
        hint="Monthly service fee — a cost to MEC, never counted as revenue"
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
            No invoices raised yet. The contract runs from 1 August 2026.
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
                    {new Date(inv.periodYear, inv.periodMonth - 1).toLocaleString(
                      "en-MY",
                      { month: "long", year: "numeric" },
                    )}
                  </span>
                  <span className="tnum shrink-0 text-sm text-ink">
                    {formatRM(inv.amount)}
                  </span>
                  <Badge tone={inv.status === "submitted" ? "received" : "idle"}>
                    {inv.status === "submitted" ? "submitted" : "draft"}
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

/** No fixed working hours, so each call-out is logged as it happens. */
function ServiceCallCard() {
  const { data } = useDashboard();
  const [state, action] = useActionState<FormState, FormData>(
    logServiceCall,
    {},
  );

  return (
    <Card>
      <CardHeader
        title="Call for Service Log"
        hint="There are no fixed working hours — log each call-out as it happens"
      />
      <div className="p-5">
        <form action={action} className="flex flex-wrap items-end gap-3">
          <label className="min-w-48 flex-1">
            <span className="mb-1.5 block text-xs font-medium text-ink-muted">
              Event
            </span>
            <select
              name="event_id"
              className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none"
            >
              {data.events.length === 0 ? (
                <option value="">— no events logged yet —</option>
              ) : (
                data.events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))
              )}
            </select>
          </label>
          <label className="min-w-48 flex-[2]">
            <span className="mb-1.5 block text-xs font-medium text-ink-muted">
              Note
            </span>
            <input
              name="note"
              placeholder="Called out to support setup"
              className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={data.events.length === 0}
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            Log call
          </button>
        </form>

        {state.error ? (
          <p role="alert" className="mt-3 text-xs text-stalled">
            {state.error}
          </p>
        ) : null}

        {data.serviceCalls.length > 0 ? (
          <ul className="mt-4 divide-y divide-line">
            {data.serviceCalls.slice(-8).reverse().map((call) => {
              const event = data.events.find((e) => e.id === call.eventId);
              return (
                <li key={call.id} className="flex items-center gap-3 py-2">
                  <span
                    aria-hidden
                    className={cn("size-2 shrink-0 rounded-full", TONE_DOT.accent)}
                  />
                  <span className="min-w-0 flex-1 text-sm text-ink">
                    {event?.name ?? "Unlinked"}
                    {call.note ? (
                      <span className="text-ink-muted"> — {call.note}</span>
                    ) : null}
                  </span>
                  <span className="tnum shrink-0 text-[0.6875rem] text-ink-subtle">
                    {formatDate(call.calledAt)}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </Card>
  );
}
