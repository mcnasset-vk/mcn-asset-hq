"use client";

import { useDashboard } from "@/components/providers/DashboardProvider";
import { Restricted } from "@/components/layout/Restricted";
import type { ModuleKey } from "@/lib/types";

/** Renders children only when the current user may view this module. */
export function ModuleGuard({
  module,
  children,
}: {
  module: ModuleKey | "commissions";
  children: React.ReactNode;
}) {
  const { canView, isSuperAdmin } = useDashboard();

  const allowed =
    module === "commissions" ? isSuperAdmin : canView(module);

  return allowed ? <>{children}</> : <Restricted />;
}
