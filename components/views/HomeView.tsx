"use client";

import { useDashboard } from "@/components/providers/DashboardProvider";

import { ExecutiveView } from "./ExecutiveView";
import { FactoryView } from "./FactoryView";
import { MdnaView } from "./MdnaView";
import { CommissionsView } from "./CommissionsView";
import { NasdaqView } from "./NasdaqView";

/**
 * The landing page adapts to who is signed in: the super admin gets the
 * combined RM20M view, a CIO lands directly on their own module.
 */
export function HomeView() {
  const { profile, isSuperAdmin } = useDashboard();

  if (isSuperAdmin) return <ExecutiveView />;

  switch (profile.module) {
    case "factory":
      return <FactoryView />;
    case "mdna":
      return <MdnaView />;
    case "nasdaq":
      return <NasdaqView />;
    case "commissions":
      return <CommissionsView />;
    default:
      return <ExecutiveView />;
  }
}
