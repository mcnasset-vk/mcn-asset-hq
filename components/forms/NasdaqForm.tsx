"use client";

import { useActionState } from "react";

import { saveNasdaqCompany, type FormState } from "@/app/(dashboard)/actions";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { NASDAQ_STATUSES } from "@/lib/constants";
import type { NasdaqCompany } from "@/lib/types";

import { RecordFormSheet } from "./RecordFormSheet";

export function NasdaqForm({
  open,
  onClose,
  company,
}: {
  open: boolean;
  onClose: () => void;
  company?: NasdaqCompany | null;
}) {
  const [state, action] = useActionState<FormState, FormData>(
    saveNasdaqCompany,
    {},
  );

  return (
    <RecordFormSheet
      open={open}
      onClose={onClose}
      title={company ? "Edit company" : "Add company"}
      subtitle="Tracked in profit-after-tax against the RM6,000,000 listing threshold. PAT is never counted as capital raised."
      action={action}
      state={state}
    >
      {company ? <input type="hidden" name="id" value={company.id} /> : null}

      <TextField
        label="Company name"
        name="company_name"
        required
        defaultValue={company?.companyName}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Contact person"
          name="contact_person"
          defaultValue={company?.contactPerson}
        />
        <TextField
          label="Telephone"
          name="phone"
          type="tel"
          defaultValue={company?.phone}
          placeholder="012-345 6789"
        />
      </div>

      <TextField
        label="Sector"
        name="sector"
        defaultValue={company?.sector}
        placeholder="e.g. Industrial manufacturing"
      />

      <SelectField
        label="Status"
        name="status"
        defaultValue={company?.status ?? "in_discussion"}
        options={NASDAQ_STATUSES.map((s) => ({
          value: s.key,
          label: s.label,
        }))}
        hint="Only 'Agreed to Join' and 'Onboarded' count toward the RM6M PAT target."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="PAT contribution (RM)"
          name="pat_contribution"
          type="number"
          defaultValue={String(company?.patContribution ?? 0)}
        />
        <TextField
          label="Agreed on"
          name="agreed_at"
          type="date"
          defaultValue={company?.agreedAt}
        />
      </div>

      <TextAreaField label="Notes" name="notes" defaultValue={company?.notes} />
    </RecordFormSheet>
  );
}
