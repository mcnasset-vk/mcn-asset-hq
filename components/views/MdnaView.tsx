"use client";

import { KpiCard } from "@/components/dashboard/KpiCard";
import { useDashboard } from "@/components/providers/DashboardProvider";
import { MdnaPanel } from "@/components/dashboard/MdnaPanel";
import { useState } from "react";

import { MdnaForm } from "@/components/forms/MdnaForm";
import { useDrillDown } from "@/components/drilldown/DrillDownProvider";
import { RecordsCard } from "@/components/drilldown/RecordsCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { allMdnaDrill, mdnaStatusDrill } from "@/lib/drilldowns";
import { formatRM } from "@/lib/format";
import { getMdnaBuckets, getMdnaSummary, mdnaRows } from "@/lib/metrics";

export function MdnaView() {
  const { openDrillDown } = useDrillDown();
  const { data } = useDashboard();
  const [editing, setEditing] = useState<
    import("@/lib/types").MdnaMember | null | undefined
  >(undefined);
  const buckets = getMdnaBuckets(data);
  const summary = getMdnaSummary(data);

  const byKey = (key: string) => buckets.find((b) => b.key === key);
  const prospects = byKey("prospect");
  const signed = byKey("signed");
  const paid = byKey("paid");
  const invested = byKey("invested");

  return (
    <>
      <PageHeader
        eyebrow="Business Line"
        title="MDNA Senior Co-Living"
        description="Members on the RM500,000 Senior Co-Living package. RM50,000 of every package is invested into MCN Asset HQ and counts toward the RM20M target."
        action={
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover"
          >
            Add member
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Banked into HQ"
          value={formatRM(summary.hqReceived)}
          detail={`${invested?.count ?? 0} members transferred`}
          tone="received"
          onClick={() => openDrillDown(mdnaStatusDrill(data, "invested"))}
        />
        <KpiCard
          label="Committed into HQ"
          value={formatRM(summary.hqCommitted)}
          detail="Signed, paid or already invested"
          tone="committed"
          onClick={() => openDrillDown(allMdnaDrill(data))}
        />
        <KpiCard
          label="Package value sold"
          value={formatRM(summary.packageValue)}
          detail={`${summary.packagesSold} packages at RM500k`}
          tone="accent"
          onClick={() => openDrillDown(mdnaStatusDrill(data, "paid"))}
        />
        <KpiCard
          label="Prospects open"
          value={String(prospects?.count ?? 0)}
          detail={`${signed?.count ?? 0} signed, awaiting payment`}
          tone="idle"
          onClick={() => openDrillDown(mdnaStatusDrill(data, "prospect"))}
        />
      </div>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-2">
        <MdnaPanel buckets={buckets} summary={summary} />
        <RecordsCard
          height="h-[32rem]"
          content={{
            title: "Awaiting Transfer into HQ",
            subtitle:
              "Members who have signed or paid but whose RM50,000 has not yet reached MCN Asset HQ.",
            amountHeader: "Into HQ (RM)",
            rows: mdnaRows([
              ...(signed?.members ?? []),
              ...(paid?.members ?? []),
            ]),
          }}
        />
      </div>

      <div className="mt-4">
        <RecordsCard
          content={{
            ...allMdnaDrill(data),
            title: "All Members",
            subtitle: "Search by member name, referrer or phone number.",
            rowAction: {
              label: () => "Edit",
              run: (row) => {
                const member = data.members.find((m) => m.id === row.id);
                if (member) setEditing(member);
              },
            },
          }}
        />
      </div>

      <MdnaForm
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        member={editing}
      />
    </>
  );
}
