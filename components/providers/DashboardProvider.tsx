"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { DashboardData } from "@/lib/data";
import type { ModuleKey, UserProfile } from "@/lib/types";

interface DashboardContextValue {
  /** Records the signed-in user is allowed to see. Filtered by RLS, not here. */
  data: DashboardData;
  /** Today's date, resolved once on the server so SSR and hydration agree. */
  now: string;
  profile: UserProfile;
  isSuperAdmin: boolean;
  canView: (module: ModuleKey) => boolean;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({
  data,
  now,
  profile,
  children,
}: {
  data: DashboardData;
  now: string;
  profile: UserProfile;
  children: ReactNode;
}) {
  const value = useMemo<DashboardContextValue>(
    () => ({
      data,
      now,
      profile,
      isSuperAdmin: profile.role === "super_admin",
      canView: (module) =>
        profile.role === "super_admin" || profile.module === module,
    }),
    [data, now, profile],
  );

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboard must be used inside <DashboardProvider>");
  }
  return ctx;
}
