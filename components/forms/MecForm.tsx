"use client";

import { useActionState } from "react";

import { saveMecRecord, type FormState } from "@/app/(dashboard)/actions";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import {
  MEC_FEE_STAGES,
  MEC_PROJECT_TIERS,
  MEC_STATUSES,
  MEC_STREAMS,
  MEC_TARGET_YEAR,
} from "@/lib/constants";
import type { MecRecord } from "@/lib/types";

import { RecordFormSheet } from "./RecordFormSheet";

/**
 * SelectField renders a flat option list — no optgroup — so the group is
 * carried in the label text instead.
 */
const STREAM_OPTIONS = MEC_STREAMS.map((s) => ({
  value: s.key,
  label: `${s.group === "external" ? "External" : "Internal"} — ${s.label}`,
}));

const UNIT_OPTIONS = [
  { value: "", label: "—" },
  { value: "pax", label: "pax" },
  { value: "tickets", label: "tickets" },
  { value: "months", label: "months" },
  { value: "events", label: "events" },
  { value: "companies", label: "companies" },
  { value: "projects", label: "projects" },
];

export function MecForm({
  open,
  onClose,
  record,
}: {
  open: boolean;
  onClose: () => void;
  record?: MecRecord | null;
}) {
  const [state, action] = useActionState<FormState, FormData>(
    saveMecRecord,
    {},
  );

  return (
    <RecordFormSheet
      open={open}
      onClose={onClose}
      title={record ? "Edit MEC record" : "Add MEC record"}
      subtitle="One record per event, sponsor, cohort, advisory project or payroll client. Amounts are gross revenue to MEC Asset."
      action={action}
      state={state}
    >
      {record ? <input type="hidden" name="id" value={record.id} /> : null}

      <SelectField
        label="Revenue stream"
        name="stream"
        defaultValue={record?.stream ?? "cec_ticketing"}
        options={STREAM_OPTIONS}
      />

      <TextField
        label="Client, sponsor or event name"
        name="client_name"
        required
        defaultValue={record?.clientName}
        placeholder="CEC Penang — Scope 3 Workshop"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Contact person"
          name="contact_person"
          defaultValue={record?.contactPerson}
        />
        <TextField
          label="Telephone"
          name="phone"
          type="tel"
          defaultValue={record?.phone}
          placeholder="012-345 6789"
        />
      </div>

      <SelectField
        label="Status"
        name="status"
        defaultValue={record?.status ?? "enquiry"}
        options={MEC_STATUSES.map((s) => ({ value: s.key, label: s.label }))}
        hint="Contracted, Invoiced and Paid all count as committed revenue. Only 'Paid to MEC' counts as received."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          label="Amount (RM)"
          name="amount"
          type="number"
          defaultValue={String(record?.amount ?? 0)}
        />
        <TextField
          label="Units"
          name="units"
          type="number"
          defaultValue={record?.units === null ? "" : String(record?.units ?? "")}
        />
        <SelectField
          label="Unit type"
          name="unit_label"
          defaultValue={record?.unitLabel ?? ""}
          options={UNIT_OPTIONS}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          label="Contracted on"
          name="contracted_at"
          type="date"
          defaultValue={record?.contractedAt}
        />
        <TextField
          label="Invoiced on"
          name="invoiced_at"
          type="date"
          defaultValue={record?.invoicedAt}
        />
        <TextField
          label="Paid on"
          name="received_at"
          type="date"
          defaultValue={record?.receivedAt}
        />
      </div>

      {/* Sponsorship-only fields. Harmless on other streams — they stay null
          and no fee is ever derived from them. */}
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Project tier"
          name="project_tier"
          defaultValue={record?.projectTier ?? ""}
          options={[
            { value: "", label: "— not a sponsorship deal —" },
            ...MEC_PROJECT_TIERS.map((t) => ({ value: t.key, label: t.label })),
          ]}
        />
        <SelectField
          label="Service fee stage"
          name="fee_stage"
          defaultValue={record?.feeStage ?? ""}
          options={[
            { value: "", label: "— no fee earned —" },
            ...MEC_FEE_STAGES.map((s) => ({ value: s.key, label: s.label })),
          ]}
          hint="Contract signed earns 50% of the 10% fee; delivered earns the rest."
        />
      </div>

      <TextField
        label="Target year"
        name="period_year"
        type="number"
        defaultValue={String(record?.periodYear ?? MEC_TARGET_YEAR)}
        hint={`Roll-ups only count records in ${MEC_TARGET_YEAR}.`}
      />

      <TextAreaField label="Notes" name="notes" defaultValue={record?.notes} />
    </RecordFormSheet>
  );
}
