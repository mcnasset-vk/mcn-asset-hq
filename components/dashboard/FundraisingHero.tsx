"use client";

import { useDrillDown } from "@/components/drilldown/DrillDownProvider";
import { useDashboard } from "@/components/providers/DashboardProvider";
import { Badge } from "@/components/ui/Badge";
import { Eyebrow } from "@/components/ui/Card";
import { IconTarget } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import {
  committedDrill,
  inFlightDrill,
  receivedDrill,
} from "@/lib/drilldowns";
import { formatDate, formatPercent, formatRM } from "@/lib/format";
import type { CapitalSummary, Pace } from "@/lib/metrics";

/**
 * The headline card. Two bands on one bar:
 *   solid  = received (money in the bank)
 *   hatched = committed but still in flight
 * Both bands and every legend chip are clickable.
 */
export function FundraisingHero({
  capital,
  pace,
}: {
  capital: CapitalSummary;
  pace: Pace;
}) {
  const { openDrillDown } = useDrillDown();
  const { data, now } = useDashboard();

  const receivedPct = capital.receivedPct * 100;
  const committedPct = capital.committedPct * 100;

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-8">
        {/* Figures + bar --------------------------------------------------- */}
        <div>
          <div className="flex items-center gap-2">
            <IconTarget className="size-4 text-accent" />
            <Eyebrow>Capital Raised into MCN Asset HQ</Eyebrow>
          </div>

          <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="tnum font-display text-4xl font-bold leading-none tracking-tight text-ink sm:text-5xl">
              {formatRM(capital.received)}
            </span>
            <span className="tnum text-base text-ink-muted">
              of {formatRM(capital.target)}
            </span>
          </div>

          <p className="mt-2 text-sm text-ink-muted">
            <span className="font-semibold text-received">
              {formatPercent(capital.receivedPct)}
            </span>{" "}
            banked ·{" "}
            <span className="font-semibold text-committed">
              {formatPercent(capital.committedPct)}
            </span>{" "}
            committed
          </p>

          {/* Progress bar */}
          <div className="mt-5">
            <div className="relative h-5 w-full overflow-hidden rounded-full bg-surface-3 ring-1 ring-inset ring-line">
              <button
                type="button"
                onClick={() => openDrillDown(inFlightDrill(data, now))}
                title={`Committed but not yet banked — ${formatRM(capital.inFlight)}`}
                aria-label={`Committed but not yet banked, ${formatRM(capital.inFlight)}. Open details.`}
                className="absolute inset-y-0 left-0 bg-committed-soft transition hover:brightness-95"
                style={{ width: `${committedPct}%` }}
              >
                <span
                  aria-hidden
                  className="hatch absolute inset-0 text-committed opacity-45"
                />
              </button>
              <button
                type="button"
                onClick={() => openDrillDown(receivedDrill(data, now))}
                title={`Received — ${formatRM(capital.received)}`}
                aria-label={`Capital received ${formatRM(capital.received)}. Open details.`}
                className="absolute inset-y-0 left-0 bg-received transition hover:brightness-110"
                style={{ width: `${receivedPct}%` }}
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <LegendChip
                tone="received"
                label="Received"
                value={formatRM(capital.received)}
                onClick={() => openDrillDown(receivedDrill(data, now))}
              />
              <LegendChip
                tone="committed"
                label="Committed"
                value={formatRM(capital.committed)}
                onClick={() => openDrillDown(committedDrill(data, now))}
              />
              <LegendChip
                tone="risk"
                label="In flight"
                value={formatRM(capital.inFlight)}
                onClick={() => openDrillDown(inFlightDrill(data, now))}
              />
            </div>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-4 sm:grid-cols-4">
            <Figure label="Still to raise" value={formatRM(capital.gap)} />
            <Figure
              label="Days remaining"
              value={String(capital.daysLeft)}
              tone={capital.daysLeft < 90 ? "risk" : undefined}
            />
            <Figure label="Deadline" value={formatDate(capital.deadline)} />
            <Figure
              label="From factories"
              value={formatRM(capital.factoryReceived)}
            />
          </dl>
        </div>

        {/* Pace ------------------------------------------------------------ */}
        <PacePanel pace={pace} capital={capital} />
      </div>
    </section>
  );
}

function PacePanel({
  pace,
  capital,
}: {
  pace: Pace;
  capital: CapitalSummary;
}) {
  const shortfall = Math.max(0, capital.target - pace.projected);

  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-lg border p-4",
        pace.onTrack
          ? "border-received-line bg-received-soft"
          : "border-stalled-line bg-stalled-soft",
      )}
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <Eyebrow className={pace.onTrack ? "text-received" : "text-stalled"}>
            Pace to deadline
          </Eyebrow>
          <Badge tone={pace.onTrack ? "received" : "stalled"}>
            {pace.onTrack ? "On track" : "Behind"}
          </Badge>
        </div>

        <dl className="mt-3 space-y-2.5">
          <PaceRow
            label="Current run-rate"
            value={`${formatRM(pace.actualPerMonth)}/mo`}
          />
          <PaceRow
            label="Required run-rate"
            value={`${formatRM(pace.requiredPerMonth)}/mo`}
            emphasis
          />
          <PaceRow
            label="Projected by 30 Nov"
            value={formatRM(pace.projected)}
          />
        </dl>
      </div>

      <p className="mt-4 border-t border-current/15 pt-3 text-xs leading-relaxed text-ink">
        {pace.onTrack ? (
          <>
            At the current rate the target is reached before the deadline. Keep
            the factory pipeline moving to hold the margin.
          </>
        ) : (
          <>
            Today&apos;s rate lands{" "}
            <strong className="tnum">{formatRM(shortfall)}</strong> short. You
            need roughly{" "}
            <strong className="tnum">{pace.multipleNeeded.toFixed(1)}×</strong>{" "}
            the current monthly pace over the remaining{" "}
            <strong className="tnum">{capital.daysLeft}</strong> days.
          </>
        )}
      </p>
    </div>
  );
}

function PaceRow({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd
        className={cn(
          "tnum text-sm font-semibold text-ink",
          emphasis && "text-base",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function Figure({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "risk";
}) {
  return (
    <div>
      <dt className="text-[0.6875rem] uppercase tracking-[0.07em] text-ink-subtle">
        {label}
      </dt>
      <dd
        className={cn(
          "tnum mt-0.5 text-sm font-semibold text-ink",
          tone === "risk" && "text-risk",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function LegendChip({
  tone,
  label,
  value,
  onClick,
}: {
  tone: "received" | "committed" | "risk";
  label: string;
  value: string;
  onClick: () => void;
}) {
  const dot = {
    received: "bg-received",
    committed: "bg-committed",
    risk: "bg-risk",
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className="group inline-flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-xs transition hover:border-accent-line hover:bg-surface-3"
    >
      <span aria-hidden className={cn("size-2 rounded-full", dot)} />
      <span className="text-ink-muted">{label}</span>
      <span className="tnum font-semibold text-ink">{value}</span>
    </button>
  );
}
