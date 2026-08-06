"use client";

import { useActionState } from "react";

import { saveFactoryDeal, type FormState } from "@/app/(dashboard)/actions";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { FACTORY_STAGES } from "@/lib/constants";
import type { FactoryDeal } from "@/lib/types";

import { RecordFormSheet } from "./RecordFormSheet";

export function FactoryForm({
  open,
  onClose,
  deal,
}: {
  open: boolean;
  onClose: () => void;
  deal?: FactoryDeal | null;
}) {
  const [state, action] = useActionState<FormState, FormData>(
    saveFactoryDeal,
    {},
  );

  return (
    <RecordFormSheet
      open={open}
      onClose={onClose}
      title={deal ? "Edit factory" : "Add factory"}
      subtitle="RM4,000,000 facility per factory, of which RM1,000,000 is invested into MCN Asset HQ."
      action={action}
      state={state}
    >
      {deal ? <input type="hidden" name="id" value={deal.id} /> : null}

      <TextField
        label="Company name"
        name="company_name"
        required
        defaultValue={deal?.companyName}
        placeholder="e.g. Seri Muda Plastics Sdn Bhd"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Contact person"
          name="contact_person"
          defaultValue={deal?.contactPerson}
        />
        <TextField
          label="Telephone"
          name="phone"
          type="tel"
          defaultValue={deal?.phone}
          placeholder="012-345 6789"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Introducer"
          name="introducer_name"
          defaultValue={deal?.introducerName}
          hint="Earns RM5,000 on disbursement and RM5,000 on the HQ investment."
        />
        <TextField
          label="Introducer telephone"
          name="introducer_phone"
          type="tel"
          defaultValue={deal?.introducerPhone}
        />
      </div>

      <SelectField
        label="Stage"
        name="stage"
        defaultValue={deal?.stage ?? "submitted"}
        options={FACTORY_STAGES.map((s) => ({ value: s.key, label: s.label }))}
        hint="Commissions are generated automatically from the disbursement and investment dates below."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Documents submitted"
          name="submitted_at"
          type="date"
          defaultValue={deal?.submittedAt}
        />
        <TextField
          label="Processing started"
          name="processing_started_at"
          type="date"
          defaultValue={deal?.processingStartedAt}
        />
        <TextField
          label="Expected disbursement"
          name="expected_disbursement_at"
          type="date"
          defaultValue={deal?.expectedDisbursementAt}
          hint="Past this date the deal is flagged as stalled."
        />
        <TextField
          label="RM4M disbursed on"
          name="disbursed_at"
          type="date"
          defaultValue={deal?.disbursedAt}
        />
        <TextField
          label="RM1M invested into HQ on"
          name="invested_at"
          type="date"
          defaultValue={deal?.investedAt}
          hint="Only this date moves money into the 'Received' figure."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Facility amount (RM)"
          name="disbursement_amount"
          type="number"
          defaultValue={String(deal?.disbursementAmount ?? 4000000)}
        />
        <TextField
          label="Into HQ (RM)"
          name="hq_investment_amount"
          type="number"
          defaultValue={String(deal?.hqInvestmentAmount ?? 1000000)}
        />
      </div>

      <TextAreaField label="Notes" name="notes" defaultValue={deal?.notes} />
    </RecordFormSheet>
  );
}
