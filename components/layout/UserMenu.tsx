"use client";

import { useDashboard } from "@/components/providers/DashboardProvider";
import { MODULE_LABELS } from "@/lib/constants";
import { signOut } from "@/app/login/actions";

/** Signed-in identity plus sign out. Replaces the Phase 1 role preview switcher. */
export function UserMenu() {
  const { profile, isSuperAdmin } = useDashboard();

  return (
    <div className="flex items-center gap-2.5">
      <div className="hidden text-right sm:block">
        <p className="text-xs font-medium leading-tight text-ink">
          {profile.fullName}
        </p>
        <p className="text-[0.6875rem] leading-tight text-ink-subtle">
          {isSuperAdmin
            ? "Super Admin"
            : `${MODULE_LABELS[profile.module!]} CIO`}
        </p>
      </div>
      <form action={signOut}>
        <button
          type="submit"
          className="rounded-lg border border-line bg-surface px-3 py-2 text-xs font-medium text-ink-muted transition hover:bg-surface-3 hover:text-ink"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
