"use client";

import { useDashboard } from "@/components/providers/DashboardProvider";

import { ExecutiveView } from "./ExecutiveView";
import { FactoryView } from "./FactoryView";
import { MdnaDivisionView } from "./MdnaDivisionView";
import { MdnaView } from "./MdnaView";
import { MecModule } from "./MecModule";
import { CommissionsView } from "./CommissionsView";
import { NasdaqView } from "./NasdaqView";

/**
 * The landing page adapts to who is signed in.
 *
 * Role first, then line: the role is the division, and a null line means the
 * whole of it — so an MDNA admin gets the division summary while someone
 * scoped to a single line lands on that line. MEC always routes through
 * MecModule, which picks the desk from the line.
 */
export function HomeView() {
  const { profile, isSuperAdmin } = useDashboard();

  if (isSuperAdmin) return <ExecutiveView />;

  if (profile.role === "mec") return <MecModule />;

  if (profile.role === "mdna") {
    switch (profile.businessLine) {
      case "factory":
        return <FactoryView />;
      case "mdna":
        return <MdnaView />;
      case "nasdaq":
        return <NasdaqView />;
      case "commissions":
        return <CommissionsView />;
      // No line = the whole division.
      default:
        return <MdnaDivisionView />;
    }
  }

  // `pending` and anything unrecognised. ExecutiveView renders the empty
  // state honestly: RLS returns no rows, so every figure reads zero.
  return <ExecutiveView />;
}
