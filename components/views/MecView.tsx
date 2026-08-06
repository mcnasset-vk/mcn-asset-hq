"use client";

import { useState } from "react";

import { KpiCard } from "@/components/dashboard/KpiCard";
import { MecEconomicsPanel } from "@/components/dashboard/MecEconomicsPanel";
import { MecStreamsPanel } from "@/components/dashboard/MecStreamsPanel";
import { useDrillDown } from "@/components/drilldown/DrillDownProvider";
import { RecordsCard } from "@/components/drilldown/RecordsCard";
import { MecForm } from "@/components/forms/MecForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { useDashboard } from "@/components/providers/DashboardProvider";
import {
  allMecDrill,
  mecCommittedDrill,
  mecDerivedDrill,
  mecStatusDrill,
} from "@/lib/drilldowns";
import { formatRM } from "@/lib/format";
import { getMecPerStaff, getMecSummary } from "@/lib/metrics";
import type { MecRecord } from "@/lib/types";

export function MecView() {
  const { openDrillDown } = useDrillDown();
  const { data } = useDashboard();
  const [editing, setEditing] = useState<MecRecord | null | undefined>(
    undefined,
  );

  const summary = getMecSummary(data);
  const perStaff = getMecPerStaff(summary);

  return (
    <>
      <PageHeader
        eyebrow="Business Line"
        title="MEC Asset (HR)"
        description={`Eight revenue streams against a ${formatRM(summary.target)} annual target for ${summary.year}. Ten per cent flows upward to MCN and twenty per cent funds the operating and profit-sharing pool. This revenue is tracked separately from the RM20,000,000 raise.`}
        action={
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover"
          >
            Add record
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Revenue paid to MEC"
          value={formatRM(summary.received)}
          detail={`${summary.year} cash collected`}
          tone="received"
          onClick={() => openDrillDown(mecStatusDrill(data, "received"))}
        />
        <KpiCard
          label="Revenue committed"
          value={formatRM(summary.committed)}
          detail={`${formatRM(summary.inFlight)} invoiced or contracted, not yet paid`}
          tone="committed"
          onClick={() => openDrillDown(mecCommittedDrill(data))}
        />
        <KpiCard
          label="10% upward to MCN"
          value={formatRM(summary.upwardReceived)}
          detail={`${formatRM(summary.upwardCommitted)} on committed revenue`}
          tone="accent"
          onClick={() => openDrillDown(mecDerivedDrill(data, "upward"))}
        />
        <KpiCard
          label="20% operating pool"
          value={formatRM(summary.poolReceived)}
          detail={`${formatRM(summary.poolCommitted)} on committed revenue`}
          tone="idle"
          onClick={() => openDrillDown(mecDerivedDrill(data, "pool"))}
        />
      </div>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-2">
        <MecStreamsPanel summary={summary} />
        <MecEconomicsPanel summary={summary} perStaff={perStaff} />
      </div>

      <div className="mt-4">
        <RecordsCard
          content={{
            ...allMecDrill(data),
            title: "All MEC Records",
            subtitle:
              "Search by client, sponsor, event or phone number. Filter by status to isolate what is still to be billed.",
            rowAction: {
              label: () => "Edit",
              run: (row) => {
                const record = data.mec.find((r) => r.id === row.id);
                if (record) setEditing(record);
              },
            },
          }}
        />
      </div>

      <MecForm
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        record={editing}
      />
    </>
  );
}
