"use client";

import { KpiCard } from "@/components/dashboard/KpiCard";
import { useDashboard } from "@/components/providers/DashboardProvider";
import { NasdaqPanel } from "@/components/dashboard/NasdaqPanel";
import { useState } from "react";

import { NasdaqForm } from "@/components/forms/NasdaqForm";
import { useDrillDown } from "@/components/drilldown/DrillDownProvider";
import { RecordsCard } from "@/components/drilldown/RecordsCard";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  allNasdaqDrill,
  nasdaqCommittedDrill,
  nasdaqStatusDrill,
} from "@/lib/drilldowns";
import { formatPercent, formatRM } from "@/lib/format";
import {
  getNasdaqSummary,
  nasdaqRows,
} from "@/lib/metrics";

export function NasdaqView() {
  const { openDrillDown } = useDrillDown();
  const { data } = useDashboard();
  const [editing, setEditing] = useState<
    import("@/lib/types").NasdaqCompany | null | undefined
  >(undefined);
  const summary = getNasdaqSummary(data);

  const pipeline = data.companies.filter(
    (c) => c.status !== "agreed" && c.status !== "onboarded",
  );

  return (
    <>
      <PageHeader
        eyebrow="Business Line"
        title="Nasdaq Listing M&A"
        description="Companies agreed to join the listing vehicle, tracked against the RM6,000,000 group profit-after-tax threshold. These figures are PAT, not capital — they never feed the RM20M raise."
        action={
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover"
          >
            Add company
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Committed PAT"
          value={formatRM(summary.committedPat)}
          detail={`${summary.companiesAgreed} companies agreed or onboarded`}
          tone="committed"
          onClick={() => openDrillDown(nasdaqCommittedDrill(data))}
        />
        <KpiCard
          label="Progress to RM6M"
          value={formatPercent(summary.pct)}
          detail={`${formatRM(summary.gap)} PAT still required`}
          tone="accent"
          onClick={() => openDrillDown(nasdaqCommittedDrill(data))}
        />
        <KpiCard
          label="Pipeline PAT"
          value={formatRM(summary.pipelinePat)}
          detail={`${pipeline.length} companies not yet committed`}
          tone="risk"
          onClick={() =>
            openDrillDown({
              title: "Nasdaq Listing — Pipeline",
              subtitle:
                "In discussion, LOI signed or in due diligence. None of this PAT counts toward the RM6M target yet.",
              total: summary.pipelinePat,
              totalLabel: `${pipeline.length} companies · PAT`,
              amountHeader: "PAT (RM)",
              rows: nasdaqRows(pipeline),
            })
          }
        />
        <KpiCard
          label="Companies onboarded"
          value={String(
            summary.buckets.find((b) => b.key === "onboarded")?.count ?? 0,
          )}
          detail={`of ${summary.totalCompanies} in the programme`}
          tone="received"
          onClick={() => openDrillDown(nasdaqStatusDrill(data, "onboarded"))}
        />
      </div>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-2">
        <NasdaqPanel summary={summary} />
        <RecordsCard
          height="h-[32rem]"
          content={{
            title: "Pipeline — Not Yet Committed",
            subtitle:
              "Convert these to close the remaining PAT gap. Each row shows the contact and their documents.",
            amountHeader: "PAT (RM)",
            rows: nasdaqRows(pipeline),
          }}
        />
      </div>

      <div className="mt-4">
        <RecordsCard
          content={{
            ...allNasdaqDrill(data),
            title: "All Companies",
            subtitle: "Search by company, contact person, sector or phone number.",
            rowAction: {
              label: () => "Edit",
              run: (row) => {
                const company = data.companies.find((c) => c.id === row.id);
                if (company) setEditing(company);
              },
            },
          }}
        />
      </div>

      <NasdaqForm
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        company={editing}
      />
    </>
  );
}
