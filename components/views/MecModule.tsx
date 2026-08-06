"use client";

import { useDashboard } from "@/components/providers/DashboardProvider";

import { LifestyleOpsView } from "./LifestyleOpsView";
import { MecView } from "./MecView";
import { OpsAdminView } from "./OpsAdminView";
import { PartnershipView } from "./PartnershipView";

/**
 * Picks the MEC dashboard for whoever is signed in.
 *
 * A job title changes which page renders, never which rows are readable —
 * `private.can_access('mec')` in Postgres is the only access boundary, and it
 * does not look at job_title at all. The super admin keeps the module-wide
 * view because they oversee all three staff rather than carrying a quota.
 */
export function MecModule() {
  const { profile, isSuperAdmin } = useDashboard();

  if (!isSuperAdmin) {
    switch (profile.jobTitle) {
      case "chief_strategic_partnership_director":
        return <PartnershipView />;
      case "operations_manager_lifestyle":
        return <LifestyleOpsView />;
      case "ops_admin_associate":
        return <OpsAdminView />;
    }
  }
  return <MecView />;
}
