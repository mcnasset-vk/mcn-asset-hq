"use client";

import { useDrillDown } from "@/components/drilldown/DrillDownProvider";
import { useDashboard } from "@/components/providers/DashboardProvider";
import { Card, CardHeader } from "@/components/ui/Card";
import { IconChevronRight, IconWarning } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import {
  bungalowTenantsDrill,
  micanaTenantDrill,
  micanaTenantStatusDrill,
} from "@/lib/drilldowns";
import { formatPercent, formatRM, formatRMCompact } from "@/lib/format";
import { isBungalowOperating, isTenantOccupying } from "@/lib/metrics";
import type { MicanaOccupancySummary } from "@/lib/metrics";
import type { Tone } from "@/lib/types";

const BAR: Record<Tone, string> = {
  received: "bg-received",
  committed: "bg-committed",
  risk: "bg-risk",
  stalled: "bg-stalled",
  idle: "bg-idle",
  accent: "bg-accent",
};

/**
 * Rooms filled against rooms available, and the tenant base behind it.
 *
 * The stacked bar is drawn over ROOMS, not tenants, so the empty rooms are
 * visible — a bar of tenant statuses alone would always look full.
 */
export function MicanaOccupancyPanel({
  summary,
}: {
  summary: MicanaOccupancySummary;
}) {
  const { openDrillDown } = useDrillDown();
  const { data } = useDashboard();

  const denominator = Math.max(1, summary.totalRooms || summary.occupiedRooms);
  const perBungalow = data.bungalows
    .filter(isBungalowOperating)
    .map((bungalow) => {
      const filled = data.tenants.filter(
        (t) => t.bungalowId === bungalow.id && isTenantOccupying(t),
      ).length;
      return { bungalow, filled };
    });

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Tenancy &amp; Occupancy"
        hint="Rooms filled across operating bungalows, and the rent they carry"
        action={
          <button
            type="button"
            onClick={() => openDrillDown(micanaTenantDrill(data, "all"))}
            className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-ink-muted transition hover:border-accent-line hover:text-accent"
          >
            All tenants
            <IconChevronRight className="size-3.5" />
          </button>
        }
      />

      {summary.underNotice > 0 ? (
        <button
          type="button"
          onClick={() => openDrillDown(micanaTenantDrill(data, "vacating"))}
          className="flex w-full items-center gap-2.5 border-b border-risk-line bg-risk-soft px-5 py-2.5 text-left transition hover:brightness-[0.98]"
        >
          <IconWarning className="size-4 shrink-0 text-risk" />
          <span className="flex-1 text-xs text-risk">
            <strong className="font-semibold">
              {summary.underNotice}{" "}
              {summary.underNotice === 1 ? "room needs" : "rooms need"}
            </strong>{" "}
            refilling — the tenant has given notice
          </span>
          <IconChevronRight className="size-4 shrink-0 text-risk" />
        </button>
      ) : null}

      <div className="p-5">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="tnum font-display text-3xl font-bold tracking-tight text-ink">
            {formatPercent(summary.occupancyPct, 0)}
          </span>
          <span className="text-sm text-ink-muted">
            <span className="tnum font-semibold text-ink">
              {summary.occupiedRooms}
            </span>{" "}
            of{" "}
            <span className="tnum font-semibold text-ink">
              {summary.totalRooms}
            </span>{" "}
            rooms filled
          </span>
        </div>
        <p className="mt-1 text-xs text-ink-muted">
          Rent roll{" "}
          <span className="tnum font-medium text-ink">
            {formatRM(summary.monthlyRentRoll)}
          </span>{" "}
          per month · {formatRM(summary.rentRollAtFull)} at full occupancy on
          today&rsquo;s average rent
        </p>

        {/* Rooms, not tenants — so vacancy is visible. */}
        <div className="mt-4 flex h-8 w-full overflow-hidden rounded-md bg-surface-3">
          {summary.buckets
            .filter((b) => b.key === "occupied" || b.key === "notice")
            .map((bucket) =>
              bucket.count === 0 ? null : (
                <button
                  key={bucket.key}
                  type="button"
                  onClick={() =>
                    openDrillDown(micanaTenantStatusDrill(data, bucket.key))
                  }
                  title={`${bucket.label} — ${bucket.count} rooms`}
                  aria-label={`${bucket.label}, ${bucket.count} rooms. Open details.`}
                  className={cn(
                    "flex items-center justify-center transition hover:brightness-110",
                    BAR[bucket.tone],
                  )}
                  style={{ width: `${(bucket.count / denominator) * 100}%` }}
                >
                  <span className="tnum text-[0.6875rem] font-semibold text-on-bar">
                    {bucket.count}
                  </span>
                </button>
              ),
            )}
          {summary.vacantRooms > 0 ? (
            <button
              type="button"
              onClick={() => openDrillDown(micanaTenantDrill(data, "pipeline"))}
              title={`${summary.vacantRooms} rooms empty`}
              aria-label={`${summary.vacantRooms} rooms empty. Open the tenant pipeline.`}
              className="flex items-center justify-center bg-idle transition hover:brightness-110"
              style={{
                width: `${(summary.vacantRooms / denominator) * 100}%`,
              }}
            >
              <span className="tnum text-[0.6875rem] font-semibold text-on-bar">
                {summary.vacantRooms}
              </span>
            </button>
          ) : null}
        </div>
        <p className="mt-2 text-[0.6875rem] text-ink-subtle">
          Filled rooms in colour, empty rooms in grey. Click the grey band for
          the enquiries and reservations that could fill them.
        </p>

        <ul className="mt-4 space-y-1">
          {summary.buckets.map((bucket) => (
            <li key={bucket.key}>
              <button
                type="button"
                onClick={() =>
                  openDrillDown(micanaTenantStatusDrill(data, bucket.key))
                }
                disabled={bucket.count === 0}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition",
                  bucket.count > 0
                    ? "hover:bg-surface-2"
                    : "cursor-default opacity-55",
                )}
              >
                <span
                  aria-hidden
                  className={cn("size-2.5 shrink-0 rounded-sm", BAR[bucket.tone])}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink">
                    {bucket.label}
                  </span>
                  <span className="block text-[0.6875rem] text-ink-subtle">
                    {bucket.hint}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="tnum block text-sm font-semibold text-ink">
                    {bucket.count}
                  </span>
                  <span className="tnum block text-[0.6875rem] text-ink-muted">
                    {formatRMCompact(bucket.rentValue)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {perBungalow.length > 0 ? (
        <ul className="divide-y divide-line border-t border-line">
          {perBungalow.map(({ bungalow, filled }) => (
            <li key={bungalow.id}>
              <button
                type="button"
                onClick={() => openDrillDown(bungalowTenantsDrill(data, bungalow.id))}
                className="flex w-full items-center gap-3 px-5 py-2.5 text-left transition hover:bg-surface-2"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-ink">
                  {bungalow.bungalowName}
                </span>
                <span className="tnum shrink-0 text-xs text-ink-muted">
                  {filled}/{bungalow.roomCount} rooms
                </span>
                <IconChevronRight className="size-4 shrink-0 text-ink-subtle" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}
