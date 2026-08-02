"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { useDashboard } from "@/components/providers/DashboardProvider";
import {
  IconDashboard,
  IconFactory,
  IconReceipt,
  IconTrending,
  IconUsers,
} from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { ModuleKey } from "@/lib/types";

import { UserMenu } from "./UserMenu";
import { ThemeToggle } from "./ThemeToggle";

type NavItem = {
  href: string;
  label: string;
  short: string;
  icon: (props: { className?: string }) => ReactNode;
  /** null = visible to everyone; a module = CIOs of that module only. */
  module: ModuleKey | null;
  superAdminOnly?: boolean;
};

const NAV: NavItem[] = [
  {
    href: "/",
    label: "Executive Overview",
    short: "Overview",
    icon: IconDashboard,
    module: null,
  },
  {
    href: "/factory",
    label: "Factory Cosif",
    short: "Factory",
    icon: IconFactory,
    module: "factory",
  },
  {
    href: "/mdna",
    label: "MDNA Co-Living",
    short: "MDNA",
    icon: IconUsers,
    module: "mdna",
  },
  {
    href: "/nasdaq",
    label: "Nasdaq M&A",
    short: "Nasdaq",
    icon: IconTrending,
    module: "nasdaq",
  },
  {
    href: "/commissions",
    label: "Commissions",
    short: "Fees",
    icon: IconReceipt,
    module: null,
    superAdminOnly: true,
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { profile, isSuperAdmin, canView } = useDashboard();

  const items = NAV.filter((item) => {
    if (item.superAdminOnly) return isSuperAdmin;
    if (item.module === null) return true;
    return canView(item.module);
  });

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Sidebar — desktop only ------------------------------------------ */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <div className="border-b border-line px-5 py-5">
          <p className="font-display text-lg font-semibold leading-tight tracking-tight text-ink">
            MCN Asset HQ
          </p>
          <p className="mt-0.5 text-[0.6875rem] uppercase tracking-[0.09em] text-ink-subtle">
            Capital &amp; Pipeline
          </p>
        </div>

        <nav className="flex-1 space-y-1 p-3" aria-label="Main">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition",
                  active
                    ? "bg-accent-soft text-accent"
                    : "text-ink-muted hover:bg-surface-3 hover:text-ink",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-line px-5 py-4">
          <p className="text-xs font-medium text-ink">{profile.fullName}</p>
          <p className="truncate text-[0.6875rem] text-ink-subtle">
            {profile.email}
          </p>
          <p className="mt-1.5 text-[0.6875rem] text-ink-subtle">
            {isSuperAdmin
              ? "Full access to all modules"
              : "Scoped to one module"}
          </p>
        </div>
      </aside>

      {/* Main ------------------------------------------------------------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur">
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="min-w-0 lg:hidden">
              <p className="truncate font-display text-base font-semibold tracking-tight text-ink">
                MCN Asset HQ
              </p>
            </div>
            <p className="hidden text-xs text-ink-muted lg:block">
              Signed in
            </p>
            <div className="flex min-w-0 items-center gap-2">
              <UserMenu />
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 pb-24 pt-5 sm:px-6 lg:pb-10">
          {children}
        </main>
      </div>

      {/* Bottom nav — mobile only ----------------------------------------- */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur lg:hidden"
      >
        <ul className="flex">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center gap-1 px-1 py-2.5 text-[0.6875rem] font-medium transition",
                    active ? "text-accent" : "text-ink-subtle",
                  )}
                >
                  <Icon className="size-5" />
                  {item.short}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
