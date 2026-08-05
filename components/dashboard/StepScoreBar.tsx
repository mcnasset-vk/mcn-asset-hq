"use client";

import { cn } from "@/lib/cn";
import { STEP_CLOSED_AT, STEP_PROVING_AT } from "@/lib/constants";
import type { Tone } from "@/lib/types";

const FILL: Record<Tone, string> = {
  received: "bg-received",
  committed: "bg-committed",
  risk: "bg-risk",
  stalled: "bg-stalled",
  idle: "bg-idle",
  accent: "bg-accent",
};

/**
 * One step's evidence score, with the two thresholds marked on the track so a
 * bar can be read against "proving" and "closed" without a legend.
 */
export function StepScoreBar({
  score,
  tone,
  className,
}: {
  score: number;
  tone: Tone;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-surface-3",
        className,
      )}
    >
      <div
        className={cn("h-full rounded-full transition-[width]", FILL[tone])}
        style={{ width: `${Math.max(score * 100, score > 0 ? 1.5 : 0)}%` }}
      />
      {[STEP_PROVING_AT, STEP_CLOSED_AT].map((mark) => (
        <span
          key={mark}
          aria-hidden
          className="absolute inset-y-0 w-px bg-surface opacity-70"
          style={{ left: `${mark * 100}%` }}
        />
      ))}
    </div>
  );
}
