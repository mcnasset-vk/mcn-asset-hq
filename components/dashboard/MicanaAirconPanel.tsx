"use client";

import { useDrillDown } from "@/components/drilldown/DrillDownProvider";
import { useDashboard } from "@/components/providers/DashboardProvider";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { IconBolt, IconChevronRight } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { airconDrill, bungalowAirconDrill } from "@/lib/drilldowns";
import { formatRM, formatRMCompact } from "@/lib/format";
import type { MicanaAirconSummary } from "@/lib/metrics";

/**
 * Aircon metering, per room per month.
 *
 * Usage inside the allowance is already paid for in the rent, so the figure
 * that matters operationally is the kWh ABOVE it — that is what gets billed
 * on, and the only part a tenant can argue about.
 */
export function MicanaAirconPanel({
  summary,
}: {
  summary: MicanaAirconSummary;
}) {
  const { openDrillDown } = useDrillDown();
  const { data } = useDashboard();

  const peak = Math.max(1, ...summary.byMonth.map((m) => m.billedAmount));
  // Twelve months is all that fits legibly at this card width.
  const months = summary.byMonth.slice(-12);

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Aircon Usage"
        hint="Metered per room each month · kWh above the included allowance is billed on"
        action={
          <button
            type="button"
            onClick={() => openDrillDown(airconDrill(data, "all"))}
            className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-ink-muted transition hover:border-accent-line hover:text-accent"
          >
            All readings
            <IconChevronRight className="size-3.5" />
          </button>
        }
      />

      <div className="p-5">
        {summary.readingCount === 0 ? (
          <p className="py-6 text-center text-sm text-ink-muted">
            No meter readings yet. Add one by hand, or point a device at the
            ingest endpoint.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="tnum font-display text-3xl font-bold tracking-tight text-ink">
                {formatRM(summary.billedAmount)}
              </span>
              <span className="text-sm text-ink-muted">
                billed on in {summary.monthLabel}
              </span>
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              <span className="tnum font-medium text-ink">
                {summary.kwhUsed}
              </span>{" "}
              kWh used over{" "}
              <span className="tnum font-medium text-ink">
                {summary.hoursRun}
              </span>{" "}
              hours ·{" "}
              <span className="tnum font-medium text-ink">
                {summary.billableKwh}
              </span>{" "}
              kWh above allowance across {summary.readingCount}{" "}
              {summary.readingCount === 1 ? "room" : "rooms"}
              {summary.iotCount > 0 ? (
                <>
                  {" "}
                  ·{" "}
                  <span className="tnum font-medium text-ink">
                    {summary.iotCount}
                  </span>{" "}
                  read automatically
                </>
              ) : null}
            </p>

            {months.length > 1 ? (
              <div className="mt-4">
                <div className="flex h-24 items-end gap-1">
                  {months.map((month) => (
                    <button
                      key={month.month}
                      type="button"
                      onClick={() =>
                        openDrillDown(airconDrill(data, "all", month.month))
                      }
                      title={`${month.label} — ${formatRM(month.billedAmount)} billed`}
                      aria-label={`${month.label}, ${formatRM(month.billedAmount)} billed. Open readings.`}
                      className="group flex flex-1 flex-col justify-end"
                    >
                      <span
                        className={cn(
                          "w-full rounded-t-sm transition group-hover:brightness-110",
                          month.month === summary.month
                            ? "bg-accent"
                            : "bg-idle",
                        )}
                        style={{
                          height: `${Math.max((month.billedAmount / peak) * 100, 3)}%`,
                        }}
                      />
                    </button>
                  ))}
                </div>
                <div className="mt-1 flex gap-1">
                  {months.map((month) => (
                    <span
                      key={month.month}
                      className="flex-1 truncate text-center text-[0.625rem] text-ink-subtle"
                    >
                      {month.label.slice(0, 3)}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>

      {summary.byBungalow.length > 0 ? (
        <ul className="divide-y divide-line border-t border-line">
          {summary.byBungalow.map((entry) => (
            <li key={entry.bungalowId}>
              <button
                type="button"
                onClick={() =>
                  openDrillDown(
                    bungalowAirconDrill(
                      data,
                      entry.bungalowId,
                      summary.month ?? undefined,
                    ),
                  )
                }
                className="flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-surface-2"
              >
                <IconBolt className="size-4 shrink-0 text-ink-subtle" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">
                    {entry.bungalowName}
                  </span>
                  <span className="tnum block text-[0.6875rem] text-ink-subtle">
                    {entry.kwhUsed} kWh · {entry.billableKwh} above allowance ·{" "}
                    {entry.readingCount}{" "}
                    {entry.readingCount === 1 ? "room" : "rooms"}
                  </span>
                </span>
                {entry.billableKwh > 0 ? (
                  <Badge tone="risk">
                    {formatRMCompact(entry.billedAmount)}
                  </Badge>
                ) : (
                  <Badge tone="received">Within allowance</Badge>
                )}
                <IconChevronRight className="size-4 shrink-0 text-ink-subtle" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <footer className="border-t border-line px-5 py-3">
        <p className="text-xs text-ink-muted">
          The allowance and rate are recorded on each reading as it lands, so
          changing a bungalow&rsquo;s house rate never rewrites a bill already
          issued.
        </p>
      </footer>
    </Card>
  );
}
