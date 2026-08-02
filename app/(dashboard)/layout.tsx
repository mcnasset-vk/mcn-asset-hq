import { redirect } from "next/navigation";

import { DrillDownProvider } from "@/components/drilldown/DrillDownProvider";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardProvider } from "@/components/providers/DashboardProvider";
import { getCurrentProfile, getDashboardData } from "@/lib/data";
import { today } from "@/lib/today";

import { PendingAccess } from "./PendingAccess";

// Session-dependent, and "days remaining" must not freeze at build time.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  // proxy.ts normally catches this; the check is repeated here because a
  // signed-in auth user without a profile row still has no role to act on.
  if (!profile) redirect("/login?reason=no-profile");

  // Signed in, but not yet given a scope by the super admin.
  if (profile.role === "pending") return <PendingAccess profile={profile} />;

  const data = await getDashboardData();

  return (
    <DashboardProvider data={data} now={today()} profile={profile}>
      <DrillDownProvider>
        <AppShell>{children}</AppShell>
      </DrillDownProvider>
    </DashboardProvider>
  );
}
