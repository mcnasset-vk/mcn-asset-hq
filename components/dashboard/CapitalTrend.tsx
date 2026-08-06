"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardHeader } from "@/components/ui/Card";
import { formatRM, formatRMCompact } from "@/lib/format";
import type { TrendPoint } from "@/lib/metrics";

/**
 * Cumulative capital received against the straight-line pace that lands
 * exactly on RM20M by 30 November. The distance between the two lines is the
 * whole story — everything else on this card is supporting detail.
 *
 * Colours are CSS variables, so the chart follows the light/dark theme with
 * no JavaScript involved.
 */
export function CapitalTrend({ points }: { points: TrendPoint[] }) {
  const data = points.map((point) => ({
    ...point,
    // Stop the actual series at today rather than dropping it to zero.
    cumulative: point.isFuture ? null : point.cumulative,
  }));

  const latest = [...points].reverse().find((p) => !p.isFuture);
  const behindBy = latest
    ? Math.max(0, latest.targetPace - latest.cumulative)
    : 0;

  return (
    <Card>
      <CardHeader
        title="Capital Raised vs Required Pace"
        hint="Cumulative money banked against the straight line to RM20M by 30 Nov 2026"
      />

      <div className="px-2 pb-2 pt-4 sm:px-4">
        <div className="h-64 w-full sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 4, right: 12, bottom: 4, left: 4 }}
            >
              <defs>
                <linearGradient id="capitalFill" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--received)"
                    stopOpacity={0.28}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--received)"
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid
                stroke="var(--line)"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={{ stroke: "var(--line)" }}
                tick={{ fill: "var(--ink-subtle)", fontSize: 11 }}
                dy={4}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={54}
                tick={{ fill: "var(--ink-subtle)", fontSize: 11 }}
                tickFormatter={(value: number) => formatRMCompact(value)}
              />
              <Tooltip content={<TrendTooltip />} cursor={{ stroke: "var(--line-strong)" }} />

              <Line
                type="monotone"
                dataKey="targetPace"
                name="Required pace"
                stroke="var(--ink-subtle)"
                strokeDasharray="5 4"
                strokeWidth={1.5}
                dot={false}
                activeDot={false}
              />
              <Area
                type="monotone"
                dataKey="cumulative"
                name="Actually banked"
                stroke="var(--received)"
                strokeWidth={2.5}
                fill="url(#capitalFill)"
                connectNulls={false}
                dot={{ r: 2.5, fill: "var(--received)", strokeWidth: 0 }}
                activeDot={{ r: 4.5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <footer className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line px-5 py-3">
        <span className="flex items-center gap-2 text-xs text-ink-muted">
          <span aria-hidden className="h-0.5 w-5 rounded bg-received" />
          Actually banked
        </span>
        <span className="flex items-center gap-2 text-xs text-ink-muted">
          <span
            aria-hidden
            className="h-0 w-5 border-t-2 border-dashed border-ink-subtle"
          />
          Required pace
        </span>
        {behindBy > 0 ? (
          <span className="text-xs text-ink-muted">
            Currently{" "}
            <span className="tnum font-semibold text-stalled">
              {formatRM(behindBy)}
            </span>{" "}
            below the pace line
          </span>
        ) : (
          <span className="text-xs font-medium text-received">
            At or ahead of the required pace
          </span>
        )}
      </footer>
    </Card>
  );
}

interface TooltipPayload {
  name?: string;
  dataKey?: string | number;
  value?: number | null;
  color?: string;
}

function TrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-ink">{label} 2026</p>
      <ul className="mt-1.5 space-y-1">
        {payload.map((entry) => (
          <li
            key={String(entry.dataKey)}
            className="flex items-center gap-2 text-xs"
          >
            <span
              aria-hidden
              className="size-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-ink-muted">{entry.name}</span>
            <span className="tnum ml-auto font-semibold text-ink">
              {typeof entry.value === "number" ? formatRM(entry.value) : "—"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
