"use client";

import { useState } from "react";

import { KpiCard } from "@/components/dashboard/KpiCard";
import { useDrillDown } from "@/components/drilldown/DrillDownProvider";
import { RecordsCard } from "@/components/drilldown/RecordsCard";
import { MecForm } from "@/components/forms/MecForm";
import { PartnershipForm } from "@/components/forms/PartnershipForm";
import { SynergyForm } from "@/components/forms/SynergyForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { useDashboard } from "@/components/providers/DashboardProvider";
import { Badge, TONE_DOT } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { MEC_SERVICE_FEE_RATE } from "@/lib/constants";
import { mecStreamDrill } from "@/lib/drilldowns";
import { formatPercent, formatRM, formatRMCompact } from "@/lib/format";
import {
  getInitiativeSummary,
  getPartnershipSummary,
  getSynergySummary,
  mecRows,
  mecServiceFee,
} from "@/lib/metrics";
import { JOB_TITLE_LABELS } from "@/lib/types";
import type {
  MecRecord,
  PartnershipInitiative,
  SynergyLog,
} from "@/lib/types";

/**
 * The Chief Strategic Partnership Director's desk.
 *
 * Three modules: the sponsorship pipeline against a personal quota, the ESG
 * alignment tracker, and the group synergy log. Only the first carries money —
 * the other two are counts, deliberately kept out of every RM total.
 */
export function PartnershipView() {
  const { openDrillDown } = useDrillDown();
  const { data, profile } = useDashboard();

  const [editingDeal, setEditingDeal] = useState<MecRecord | null | undefined>(
    undefined,
  );
  const [editingInitiative, setEditingInitiative] = useState<
    PartnershipInitiative | null | undefined
  >(undefined);
  const [editingLog, setEditingLog] = useState<SynergyLog | null | undefined>(
    undefined,
  );

  // Scoped to this person: the quota is personal, not the whole desk's.
  const partnership = getPartnershipSummary(data, profile.id);
  const initiatives = getInitiativeSummary(data);
  const synergy = getSynergySummary(data);

  return (
    <>
      <PageHeader
        eyebrow={
          profile.jobTitle
            ? JOB_TITLE_LABELS[profile.jobTitle]
            : "Partnership Desk"
        }
        title={profile.fullName || "Partnership Desk"}
        description={`Corporate sponsorship against a ${formatRM(partnership.quota)} Year-1 quota, plus the ESG alignment and group synergy trackers. Every save is timestamped and attributed to you in the audit trail.`}
        action={
          <button
            type="button"
            onClick={() => setEditingDeal(null)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover"
          >
            Add sponsorship deal
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Contracted this year"
          value={formatRM(partnership.contracted)}
          detail={`of ${formatRM(partnership.quota)} quota · ${formatPercent(partnership.quotaPct)}`}
          tone="received"
          onClick={() => openDrillDown(mecStreamDrill(data, "corporate_sponsor"))}
        />
        <KpiCard
          label="Still to close"
          value={formatRM(partnership.quotaGap)}
          detail={`${partnership.dealCount} deals on the desk`}
          tone="risk"
          onClick={() => openDrillDown(mecStreamDrill(data, "corporate_sponsor"))}
        />
        <KpiCard
          label="Service fee earned"
          value={formatRM(partnership.feeEarned)}
          detail={`of ${formatRM(partnership.feeFull)} at ${formatPercent(MEC_SERVICE_FEE_RATE, 0)}`}
          tone="committed"
          onClick={() =>
            openDrillDown({
              title: "Professional Service Fee — Earned",
              subtitle:
                "Half the 10% fee is earned when the contract is signed and paid, the remainder on delivery. Amounts below are the fee, not the contract value.",
              amountHeader: "Fee earned (RM)",
              total: partnership.feeEarned,
              totalLabel: `${partnership.dealCount} deals`,
              rows: mecRows(partnership.deals).map((row) => {
                const deal = partnership.deals.find((d) => d.id === row.id)!;
                return {
                  ...row,
                  amount: mecServiceFee(deal).earned,
                  amountLabel: "fee earned",
                };
              }),
            })
          }
        />
        <KpiCard
          label="Partnerships live"
          value={String(initiatives.total)}
          detail={`${synergy.totalReach} stakeholders engaged`}
          tone="accent"
          onClick={() => setEditingInitiative(null)}
        />
      </div>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-2">
        <QuotaPanel summary={partnership} />
        <FeeLadderPanel summary={partnership} />
      </div>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-2">
        <InitiativesPanel
          summary={initiatives}
          onAdd={() => setEditingInitiative(null)}
          onEdit={setEditingInitiative}
        />
        <SynergyPanel
          summary={synergy}
          onAdd={() => setEditingLog(null)}
          onEdit={setEditingLog}
        />
      </div>

      <div className="mt-4">
        <RecordsCard
          content={{
            title: "My Sponsorship Deals",
            subtitle:
              "Every corporate sponsorship deal attributed to you. Amounts are contract value; the fee is 10% of each.",
            amountHeader: "Contract value (RM)",
            total: partnership.pipeline,
            totalLabel: `${partnership.dealCount} deals`,
            rows: mecRows(partnership.deals),
            rowAction: {
              label: () => "Edit",
              run: (row) => {
                const deal = data.mec.find((r) => r.id === row.id);
                if (deal) setEditingDeal(deal);
              },
            },
          }}
        />
      </div>

      <MecForm
        open={editingDeal !== undefined}
        onClose={() => setEditingDeal(undefined)}
        record={editingDeal}
      />
      <PartnershipForm
        open={editingInitiative !== undefined}
        onClose={() => setEditingInitiative(undefined)}
        initiative={editingInitiative}
      />
      <SynergyForm
        open={editingLog !== undefined}
        onClose={() => setEditingLog(undefined)}
        log={editingLog}
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */

function QuotaPanel({
  summary,
}: {
  summary: ReturnType<typeof getPartnershipSummary>;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Year-1 Sponsorship Quota"
        hint={`${formatRM(summary.quota)} personal target — a slice of MEC's RM3,000,000 corporate sponsor stream, not a replacement for it`}
      />
      <div className="p-5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="tnum font-display text-3xl font-bold tracking-tight text-ink">
            {formatRM(summary.contracted)}
          </span>
          <span className="tnum text-sm text-ink-muted">
            of {formatRM(summary.quota)}
          </span>
        </div>
        <p className="mt-1 text-xs text-ink-muted">
          <span className="font-semibold text-received">
            {formatPercent(summary.quotaPct)}
          </span>{" "}
          contracted ·{" "}
          <span className="tnum">{formatRM(summary.quotaGap)}</span> still to
          close
        </p>

        <div className="mt-4 h-5 w-full overflow-hidden rounded-full bg-surface-3 ring-1 ring-inset ring-line">
          <div
            aria-hidden
            className="h-full bg-received"
            style={{ width: `${summary.quotaPct * 100}%` }}
          />
        </div>

        <ul className="mt-4 space-y-1">
          {summary.byTier.map((tier) => (
            <li
              key={tier.key}
              className="flex items-center gap-3 rounded-lg px-2.5 py-2"
            >
              <span className="min-w-0 flex-1 text-sm font-medium text-ink">
                {tier.label}
              </span>
              <span className="shrink-0 text-right">
                <span className="tnum block text-sm font-semibold text-ink">
                  {formatRMCompact(tier.contractValue)}
                </span>
                <span className="tnum block text-[0.6875rem] text-ink-muted">
                  {tier.count} {tier.count === 1 ? "deal" : "deals"}
                </span>
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-4 rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-[0.6875rem] leading-relaxed text-ink-muted">
          Only signed and delivered contracts count toward the quota. Proposals
          still open are shown on the deals table but never in this figure.
        </p>
      </div>
    </Card>
  );
}

function FeeLadderPanel({
  summary,
}: {
  summary: ReturnType<typeof getPartnershipSummary>;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Professional Service Fee"
        hint={`${formatPercent(MEC_SERVICE_FEE_RATE, 0)} of contract value, earned in two halves`}
      />
      <div className="p-5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="tnum font-display text-3xl font-bold tracking-tight text-ink">
            {formatRM(summary.feeEarned)}
          </span>
          <span className="tnum text-sm text-ink-muted">
            of {formatRM(summary.feeFull)} at full delivery
          </span>
        </div>
        <p className="mt-1 text-xs text-ink-muted">
          <span className="tnum">{formatRM(summary.feeOutstanding)}</span> still
          to earn
        </p>

        <ul className="mt-4 space-y-1">
          {summary.byStage.map((stage) => (
            <li
              key={stage.key}
              className="flex items-center gap-3 rounded-lg px-2.5 py-2"
            >
              <span
                aria-hidden
                className={cn("size-2.5 shrink-0 rounded-sm", TONE_DOT[stage.tone])}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink">
                  {stage.label}
                </span>
                <span className="block text-[0.6875rem] text-ink-subtle">
                  {stage.hint}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="tnum block text-sm font-semibold text-ink">
                  {formatRMCompact(stage.feeEarned)}
                </span>
                <span className="tnum block text-[0.6875rem] text-ink-muted">
                  {stage.count} · {formatRMCompact(stage.contractValue)}
                </span>
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-4 rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-[0.6875rem] leading-relaxed text-ink-muted">
          This is the fee MEC charges the sponsor. It is separate from the 10%
          of MEC revenue that flows upward to MCN — the two rates coincide but
          are never the same money.
        </p>
      </div>
    </Card>
  );
}

function InitiativesPanel({
  summary,
  onAdd,
  onEdit,
}: {
  summary: ReturnType<typeof getInitiativeSummary>;
  onAdd: () => void;
  onEdit: (i: PartnershipInitiative) => void;
}) {
  const { data } = useDashboard();

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Strategic Partnership & ESG Alignment"
        hint="Community initiatives, co-branding and network expansion"
        action={
          <button
            type="button"
            onClick={onAdd}
            className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-ink-muted transition hover:border-accent-line hover:text-accent"
          >
            Add initiative
          </button>
        }
      />
      <div className="p-5">
        {summary.total === 0 ? (
          <p className="text-sm text-ink-muted">
            No initiatives logged yet. Add the first to start the audit trail.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {summary.byStatus
                .filter((s) => s.count > 0)
                .map((s) => (
                  <Badge key={s.key} tone={s.tone} dot>
                    {s.label} · {s.count}
                  </Badge>
                ))}
            </div>
            <ul className="mt-4 divide-y divide-line">
              {data.initiatives.map((i) => (
                <li key={i.id}>
                  <button
                    type="button"
                    onClick={() => onEdit(i)}
                    className="w-full py-2.5 text-left transition hover:text-accent"
                  >
                    <span className="block text-sm font-medium text-ink">
                      {i.title}
                    </span>
                    <span className="block text-[0.6875rem] text-ink-subtle">
                      {i.collaborator || "No collaborator recorded"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Card>
  );
}

function SynergyPanel({
  summary,
  onAdd,
  onEdit,
}: {
  summary: ReturnType<typeof getSynergySummary>;
  onAdd: () => void;
  onEdit: (l: SynergyLog) => void;
}) {
  const { data } = useDashboard();

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Stakeholder & Group Synergy"
        hint="Cross-subsidiary collaboration across the MCN Group pillars"
        action={
          <button
            type="button"
            onClick={onAdd}
            className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-ink-muted transition hover:border-accent-line hover:text-accent"
          >
            Add log
          </button>
        }
      />
      <div className="p-5">
        {summary.total === 0 ? (
          <p className="text-sm text-ink-muted">
            No synergy logged yet. Reach is counted in stakeholders, never in
            ringgit.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline gap-x-3">
              <span className="tnum font-display text-3xl font-bold tracking-tight text-ink">
                {summary.totalReach}
              </span>
              <span className="text-sm text-ink-muted">
                stakeholders engaged across {summary.bySubsidiary.length} units
              </span>
            </div>
            <ul className="mt-4 divide-y divide-line">
              {data.synergy.map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => onEdit(l)}
                    className="flex w-full items-center gap-3 py-2.5 text-left transition hover:text-accent"
                  >
                    <span className="min-w-0 flex-1 text-sm font-medium text-ink">
                      {l.subsidiary}
                    </span>
                    <span className="tnum shrink-0 text-sm font-semibold text-ink">
                      {l.reachMetric}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Card>
  );
}
