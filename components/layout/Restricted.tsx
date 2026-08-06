"use client";

import Link from "next/link";

import { useDashboard } from "@/components/providers/DashboardProvider";
import { IconLock } from "@/components/ui/icons";
import { MODULE_LABELS } from "@/lib/constants";

/**
 * Phase 1 access notice. This is a UI courtesy only — in Phase 2 the real
 * guard is row-level security in Postgres, so a scoped user cannot read
 * another module's rows even by calling the API directly.
 */
export function Restricted() {
  const { profile } = useDashboard();
  const ownModule = profile.module;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border border-line bg-surface px-6 py-14 text-center shadow-sm">
      <span className="rounded-full border border-line bg-surface-3 p-3 text-ink-subtle">
        <IconLock className="size-6" />
      </span>
      <h1 className="font-display text-xl font-semibold text-ink">
        Not your module
      </h1>
      <p className="text-sm text-ink-muted">
        {profile.fullName} is scoped to{" "}
        <strong className="text-ink">
          {ownModule ? MODULE_LABELS[ownModule] : "a single module"}
        </strong>{" "}
        and cannot view this section.
      </p>
      {ownModule ? (
        <Link
          href="/"
          className="mt-1 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover"
        >
          Go to my dashboard
        </Link>
      ) : null}
      <p className="mt-2 text-[0.6875rem] leading-relaxed text-ink-subtle">
        This restriction is enforced by the database, not just this screen.
      </p>
    </div>
  );
}
