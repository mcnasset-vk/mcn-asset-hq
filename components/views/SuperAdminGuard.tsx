"use client";

import { Restricted } from "@/components/layout/Restricted";
import { useDashboard } from "@/components/providers/DashboardProvider";

/**
 * Renders children for the super admin only. Like `ModuleGuard`, this is a
 * courtesy: the underlying rows are closed to everyone else by row level
 * security, so a CIO calling the API directly gets nothing either.
 */
export function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const { isSuperAdmin } = useDashboard();

  return isSuperAdmin ? <>{children}</> : <Restricted />;
}
