"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { useDashboard } from "@/components/providers/DashboardProvider";
import {
  IconBriefcase,
  IconChevronRight,
  IconDashboard,
  IconFactory,
  IconReceipt,
  IconShield,
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
  /** Shown only to the super admin, whatever `module` says. */
  superAdminOnly?: boolean;
};

const OVERVIEW: NavItem = {
  href: "/",
  label: "Executive Overview",
  short: "Overview",
  icon: IconDashboard,
  module: null,
};

/**
 * MDNA is a division, not a module: it holds four business lines. A CIO
 * scoped to `mdna` (MDNA Admin) runs the whole division and sees all four;
 * any other CIO sees only their own line listed beneath the heading.
 */
const MDNA_LINES: NavItem[] = [
  {
    href: "/factory",
    label: "Factory Cosif",
    short: "Factory",
    icon: IconFactory,
    module: "factory",
  },
  {
    href: "/mdna/admin",
    label: "MDNA Admin",
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
    label: "Fees",
    short: "Fees",
    icon: IconReceipt,
    module: "commissions",
  },
];

/**
 * MEC is its own division, a peer of MDNA rather than one of its lines. Its
 * business line therefore sits at the same indent as Factory Cosif and Nasdaq
 * M&A, under a heading of its own — which is also what the database says:
 * `private.can_access` lets the mdna scope span its four lines but never mec.
 */
const MEC_LINES: NavItem[] = [
  {
    href: "/mec",
    label: "MEC Asset (HR)",
    short: "MEC",
    icon: IconBriefcase,
    module: "mec",
  },
];

/** Super admin only — granting access is not a business line. */
const ADMIN: NavItem = {
  href: "/admin/users",
  label: "User Access",
  short: "Users",
  icon: IconShield,
  module: null,
  superAdminOnly: true,
};

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { profile, isSuperAdmin, canView } = useDashboard();

  const visible = (item: NavItem) =>
    item.module === null || canView(item.module);

  // The division summary spans all four MDNA lines, so it is offered to the
  // super admin and to MDNA Admin — the two roles that can actually see them.
  const canSeeDivision = isSuperAdmin || profile.module === "mdna";

  const mdnaLines = MDNA_LINES.filter(visible);
  const mecLines = MEC_LINES.filter(visible);

  // Mobile has no room for a nested tree, so it shows the leaves. Anyone who
  // can see the division gets the summary; a single-line CIO gets their line.
  const mobileItems = [
    OVERVIEW,
    ...mdnaLines,
    ...mecLines,
    ...(isSuperAdmin ? [ADMIN] : []),
  ].map((item) =>
    canSeeDivision && item.href === "/mdna/admin"
      ? { ...item, href: "/mdna", short: "MDNA" }
      : item,
  );

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

        <nav
          className="scrollbar-slim flex-1 space-y-1 overflow-y-auto p-3"
          aria-label="Main"
        >
          <NavLink item={OVERVIEW} pathname={pathname} />

          {mdnaLines.length > 0 ? (
            <div className="pt-3">
              {canSeeDivision ? (
                <Link
                  href="/mdna"
                  aria-current={pathname === "/mdna" ? "page" : undefined}
                  className={cn(
                    "group flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 transition",
                    pathname === "/mdna"
                      ? "bg-accent-soft"
                      : "hover:bg-surface-3",
                  )}
                >
                  <span
                    className={cn(
                      "text-[0.6875rem] font-semibold uppercase tracking-[0.09em]",
                      pathname === "/mdna" ? "text-accent" : "text-ink-subtle",
                    )}
                  >
                    MDNA
                  </span>
                  <IconChevronRight
                    className={cn(
                      "size-3.5 transition",
                      pathname === "/mdna"
                        ? "text-accent"
                        : "text-ink-subtle group-hover:translate-x-0.5",
                    )}
                  />
                </Link>
              ) : (
                <p className="px-3 py-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.09em] text-ink-subtle">
                  MDNA
                </p>
              )}

              <div className="mt-1 space-y-1 border-l border-line pl-2">
                {mdnaLines.map((item) => (
                  <NavLink key={item.href} item={item} pathname={pathname} />
                ))}
              </div>
            </div>
          ) : null}

          {mecLines.length > 0 ? (
            <div className="pt-3">
              {/* A plain heading, not a link: MEC has no division summary
                  page, so a clickable label would lead nowhere. */}
              <p className="px-3 py-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.09em] text-ink-subtle">
                MEC
              </p>
              <div className="mt-1 space-y-1 border-l border-line pl-2">
                {mecLines.map((item) => (
                  <NavLink key={item.href} item={item} pathname={pathname} />
                ))}
              </div>
            </div>
          ) : null}

          {isSuperAdmin ? (
            <div className="mt-3 space-y-1 border-t border-line pt-3">
              <NavLink item={ADMIN} pathname={pathname} />
            </div>
          ) : null}
        </nav>

        <div className="border-t border-line px-5 py-4">
          <p className="text-xs font-medium text-ink">{profile.fullName}</p>
          <p className="truncate text-[0.6875rem] text-ink-subtle">
            {profile.email}
          </p>
          <p className="mt-1.5 text-[0.6875rem] text-ink-subtle">
            {isSuperAdmin
              ? "Full access to all modules"
              : profile.module === "mdna"
                ? "MDNA division — four business lines"
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
            <p className="hidden text-xs text-ink-muted lg:block">Signed in</p>
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
          {mobileItems.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href} className="min-w-0 flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center gap-1 px-1 py-2.5 text-[0.6875rem] font-medium transition",
                    active ? "text-accent" : "text-ink-subtle",
                  )}
                >
                  <Icon className="size-5 shrink-0" />
                  <span className="max-w-full truncate">{item.short}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
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
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  // /mdna must not light up while /mdna/admin is open, and vice versa.
  if (href === "/mdna") return pathname === "/mdna";
  return pathname === href || pathname.startsWith(`${href}/`);
}
