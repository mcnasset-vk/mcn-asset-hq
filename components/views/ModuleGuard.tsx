"use client";

import { useDashboard } from "@/components/providers/DashboardProvider";
import { Restricted } from "@/components/layout/Restricted";
import type { ModuleKey } from "@/lib/types";

/** Renders children only when the current user may view this module. */
export function ModuleGuard({
  module,
  children,
}: {
  module: ModuleKey;
  children: React.ReactNode;
}) {
  const { canView } = useDashboard();

  const allowed = canView(module);

  return allowed ? <>{children}</> : <Restricted />;
}
