"use client";

import { FactoryFunnel } from "@/components/dashboard/FactoryFunnel";
import { useDashboard } from "@/components/providers/DashboardProvider";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { useState } from "react";

import { FactoryForm } from "@/components/forms/FactoryForm";
import { useDrillDown } from "@/components/drilldown/DrillDownProvider";
import { RecordsCard } from "@/components/drilldown/RecordsCard";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  allFactoriesDrill,
  factoryStageDrill,
  stalledFactoriesDrill,
} from "@/lib/drilldowns";
import { formatRM } from "@/lib/format";
import {
  factoryRows,
  getFactoryStages,
  getStalledFactories,
  isFactoryCommitted,
  isFactoryReceived,
} from "@/lib/metrics";

export function FactoryView() {
  const { openDrillDown } = useDrillDown();
  const { data, now } = useDashboard();
  const [editing, setEditing] = useState<
    import("@/lib/types").FactoryDeal | null | undefined
  >(undefined);
  const stages = getFactoryStages(data, now);
  const stalled = getStalledFactories(data, now);
  const processing = stages.find((s) => s.key === "processing")?.deals ?? [];

  const received = data.factories.filter(isFactoryReceived);
  const committed = data.factories.filter(isFactoryCommitted);
  const receivedValue = received.reduce((s, d) => s + d.hqInvestmentAmount, 0);
  const committedValue = committed.reduce((s, d) => s + d.hqInvestmentAmount, 0);
  const facilityValue = committed.reduce((s, d) => s + d.disbursementAmount, 0);

  return (
    <>
      <PageHeader
        eyebrow="Business Line"
        title="Factory Cosif Pipeline"
        description="Every factory from document submission through to the RM1,000,000 invested into MCN Asset HQ. Each factory receives a RM4,000,000 facility; RM1,000,000 of that comes back into HQ."
        action={
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover"
          >
            Add factory
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Banked into HQ"
          value={formatRM(receivedValue)}
          detail={`${received.length} factories completed`}
          tone="received"
          onClick={() => openDrillDown(factoryStageDrill(data, "invested", now))}
        />
        <KpiCard
          label="Committed into HQ"
          value={formatRM(committedValue)}
          detail={`${committed.length} factories disbursed or beyond`}
          tone="committed"
          onClick={() => openDrillDown(factoryStageDrill(data, "disbursed", now))}
        />
        <KpiCard
          label="Facilities disbursed"
          value={formatRM(facilityValue)}
          detail="RM4M released per factory"
          tone="accent"
          onClick={() => openDrillDown(allFactoriesDrill(data, now))}
        />
        <KpiCard
          label="Stalled in processing"
          value={String(stalled.length)}
          detail={
            stalled.length > 0
              ? "Past the expected 2–3 month window"
              : "All processing deals on schedule"
          }
          tone={stalled.length > 0 ? "stalled" : "idle"}
          onClick={() => openDrillDown(stalledFactoriesDrill(data, now))}
        />
      </div>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-2">
        <FactoryFunnel stages={stages} stalledCount={stalled.length} />
        <RecordsCard
          height="h-[32rem]"
          content={{
            title: "Currently in Processing",
            subtitle:
              "Deals inside the 2–3 month approval window. Anything past its expected date is flagged.",
            amountHeader: "Into HQ (RM)",
            rows: factoryRows(processing, now),
          }}
        />
      </div>

      <div className="mt-4">
        <RecordsCard
          content={{
            ...allFactoriesDrill(data, now),
            title: "All Factories",
            subtitle:
              "Search by company, contact person, introducer or phone number.",
            rowAction: {
              label: () => "Edit",
              run: (row) => {
                const deal = data.factories.find((d) => d.id === row.id);
                if (deal) setEditing(deal);
              },
            },
          }}
        />
      </div>

      <FactoryForm
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        deal={editing}
      />
    </>
  );
}
