"use client";

import { useState, useTransition } from "react";

import { setPayoutPaid } from "@/app/(dashboard)/actions";
import { MicanaAirconPanel } from "@/components/dashboard/MicanaAirconPanel";
import { MicanaOccupancyPanel } from "@/components/dashboard/MicanaOccupancyPanel";
import { MicanaPayoutPanel } from "@/components/dashboard/MicanaPayoutPanel";
import { MicanaRenovationPanel } from "@/components/dashboard/MicanaRenovationPanel";
import { MicanaScorecard } from "@/components/dashboard/MicanaScorecard";
import { MicanaSourcingFunnel } from "@/components/dashboard/MicanaSourcingFunnel";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { useDrillDown } from "@/components/drilldown/DrillDownProvider";
import { RecordsCard } from "@/components/drilldown/RecordsCard";
import { AirconReadingForm } from "@/components/forms/AirconReadingForm";
import { MicanaBungalowForm } from "@/components/forms/MicanaBungalowForm";
import { MicanaTenantForm } from "@/components/forms/MicanaTenantForm";
import { OwnerPayoutForm } from "@/components/forms/OwnerPayoutForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { useDashboard } from "@/components/providers/DashboardProvider";
import {
  airconDrill,
  allBungalowsDrill,
  micanaPayoutDrill,
  micanaStageDrill,
  micanaTenantDrill,
  renovationOverrunDrill,
} from "@/lib/drilldowns";
import { formatPercent, formatRM } from "@/lib/format";
import {
  getMicanaAirconSummary,
  getMicanaOccupancy,
  getMicanaPayoutSummary,
  getMicanaRenovationSummary,
  getMicanaScorecard,
  getMicanaStages,
} from "@/lib/metrics";
import type {
  MicanaAirconReading,
  MicanaBungalow,
  MicanaOwnerPayout,
  MicanaTenant,
} from "@/lib/types";

/** `undefined` = sheet closed, `null` = adding, a record = editing. */
type Editing<T> = T | null | undefined;

const ADD_BUTTON =
  "rounded-lg border border-line px-3 py-2 text-sm font-medium text-ink-muted transition hover:border-accent-line hover:text-accent";

export function MicanaView() {
  const { openDrillDown } = useDrillDown();
  const { data, now } = useDashboard();
  const [, startTransition] = useTransition();

  const [bungalow, setBungalow] = useState<Editing<MicanaBungalow>>(undefined);
  const [tenant, setTenant] = useState<Editing<MicanaTenant>>(undefined);
  const [reading, setReading] = useState<Editing<MicanaAirconReading>>(undefined);
  const [payout, setPayout] = useState<Editing<MicanaOwnerPayout>>(undefined);

  const stages = getMicanaStages(data);
  const renovation = getMicanaRenovationSummary(data, now);
  const occupancy = getMicanaOccupancy(data);
  const aircon = getMicanaAirconSummary(data);
  const payouts = getMicanaPayoutSummary(data, now);
  const scorecard = getMicanaScorecard(data);

  // Settling a month is one click; the ledger refreshes from the server after.
  const togglePaid = {
    label: (row: { statusLabel: string }) =>
      row.statusLabel === "Paid" ? "Mark unpaid" : "Mark paid",
    run: (row: { id: string; statusLabel: string }) => {
      const paid = row.statusLabel !== "Paid";
      startTransition(() => {
        void setPayoutPaid(row.id, paid);
      });
    },
  };

  return (
    <>
      <PageHeader
        eyebrow="Business Line"
        title="Micana Innovation Co-Living &amp; HealthTech"
        description="Bungalows sourced from private owners, renovated, and let room by room on a profit share with the owner. Micana is measured on its own operating scorecard — the figures here are trading profit, not capital, and never count toward the RM20,000,000 target."
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setBungalow(null)}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover"
            >
              Add bungalow
            </button>
            <button
              type="button"
              onClick={() => setTenant(null)}
              className={ADD_BUTTON}
            >
              Add tenant
            </button>
            <button
              type="button"
              onClick={() => setReading(null)}
              className={ADD_BUTTON}
            >
              Add reading
            </button>
            <button
              type="button"
              onClick={() => setPayout(null)}
              className={ADD_BUTTON}
            >
              Add month
            </button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Bungalows operating"
          value={String(scorecard.bungalowsOperating)}
          detail={`${scorecard.bungalowsSourced} sourced in total`}
          tone="received"
          onClick={() => openDrillDown(micanaStageDrill(data, "operating", now))}
        />
        <KpiCard
          label="Occupancy"
          value={formatPercent(occupancy.occupancyPct, 0)}
          detail={`${occupancy.occupiedRooms} of ${occupancy.totalRooms} rooms · ${formatRM(occupancy.monthlyRentRoll)}/mo`}
          tone={occupancy.occupancyPct >= 0.8 ? "received" : "risk"}
          onClick={() => openDrillDown(micanaTenantDrill(data, "occupying"))}
        />
        <KpiCard
          label="Owner share payable"
          value={formatRM(payouts.accrued)}
          detail={
            payouts.overdue.length > 0
              ? `${payouts.overdue.length} months overdue`
              : `${payouts.accruedCount} months payable`
          }
          tone={payouts.overdue.length > 0 ? "stalled" : "risk"}
          onClick={() => openDrillDown(micanaPayoutDrill(data, "accrued", now))}
        />
        <KpiCard
          label="Renovation over budget"
          value={formatRM(renovation.overrunAmount)}
          detail={
            renovation.overrunBungalows.length > 0
              ? `${renovation.overrunBungalows.length} bungalows over`
              : "Every fit-out within tolerance"
          }
          tone={renovation.overrunAmount > 0 ? "stalled" : "idle"}
          onClick={() => openDrillDown(renovationOverrunDrill(data, now))}
        />
      </div>

      <div className="mt-4">
        <MicanaScorecard scorecard={scorecard} />
      </div>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-2">
        <MicanaSourcingFunnel stages={stages} />
        <MicanaRenovationPanel summary={renovation} />
        <MicanaOccupancyPanel summary={occupancy} />
        <MicanaAirconPanel summary={aircon} />
      </div>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-2">
        <MicanaPayoutPanel summary={payouts} />
        <RecordsCard
          height="h-[32rem]"
          content={{
            ...micanaPayoutDrill(data, "accrued", now),
            rowAction: togglePaid,
          }}
        />
      </div>

      <div className="mt-4">
        <RecordsCard
          content={{
            ...allBungalowsDrill(data, now),
            title: "All Bungalows",
            subtitle:
              "Search by bungalow, owner or phone number. The amount is renovation spend.",
            rowAction: {
              label: () => "Edit",
              run: (row) => {
                const found = data.bungalows.find((b) => b.id === row.id);
                if (found) setBungalow(found);
              },
            },
          }}
        />
      </div>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-2">
        <RecordsCard
          height="h-[32rem]"
          content={{
            ...micanaTenantDrill(data, "all"),
            title: "All Tenants",
            subtitle: "Search by tenant, bungalow, room or phone number.",
            rowAction: {
              label: () => "Edit",
              run: (row) => {
                const found = data.tenants.find((t) => t.id === row.id);
                if (found) setTenant(found);
              },
            },
          }}
        />
        <RecordsCard
          height="h-[32rem]"
          content={{
            ...airconDrill(data, "all"),
            title: "All Meter Readings",
            subtitle:
              "Every aircon reading recorded, by hand or by device. Export to CSV for the billing run.",
            rowAction: {
              label: () => "Edit",
              run: (row) => {
                const found = data.airconReadings.find((r) => r.id === row.id);
                if (found) setReading(found);
              },
            },
          }}
        />
      </div>

      <MicanaBungalowForm
        open={bungalow !== undefined}
        onClose={() => setBungalow(undefined)}
        bungalow={bungalow}
      />
      <MicanaTenantForm
        open={tenant !== undefined}
        onClose={() => setTenant(undefined)}
        tenant={tenant}
        bungalows={data.bungalows}
      />
      <AirconReadingForm
        open={reading !== undefined}
        onClose={() => setReading(undefined)}
        reading={reading}
        bungalows={data.bungalows}
        tenants={data.tenants}
      />
      <OwnerPayoutForm
        open={payout !== undefined}
        onClose={() => setPayout(undefined)}
        payout={payout}
        bungalows={data.bungalows}
      />
    </>
  );
}
