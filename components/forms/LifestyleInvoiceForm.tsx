"use client";

import { useActionState } from "react";

import {
  saveLifestyleInvoice,
  type FormState,
} from "@/app/(dashboard)/actions";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { LIFESTYLE_MONTHLY_FEE } from "@/lib/constants";
import type { LifestyleInvoice } from "@/lib/types";

import { RecordFormSheet } from "./RecordFormSheet";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Module 4 — the monthly service fee invoice. */
export function LifestyleInvoiceForm({
  open,
  onClose,
  invoice,
}: {
  open: boolean;
  onClose: () => void;
  invoice?: LifestyleInvoice | null;
}) {
  const [state, action] = useActionState<FormState, FormData>(
    saveLifestyleInvoice,
    {},
  );

  return (
    <RecordFormSheet
      open={open}
      onClose={onClose}
      title={invoice ? "Edit invoice" : "Submit monthly invoice"}
      subtitle="Contractual monthly service fee, effective 1 August 2026."
      action={action}
      state={state}
    >
      {invoice ? <input type="hidden" name="id" value={invoice.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Invoice month"
          name="period_month"
          defaultValue={String(invoice?.periodMonth ?? 8)}
          options={MONTHS.map((m, i) => ({
            value: String(i + 1),
            label: m,
          }))}
        />
        <TextField
          label="Year"
          name="period_year"
          type="number"
          defaultValue={String(invoice?.periodYear ?? 2026)}
        />
      </div>

      <TextField
        label="Invoice amount (RM)"
        name="amount"
        type="number"
        defaultValue={String(invoice?.amount ?? LIFESTYLE_MONTHLY_FEE)}
        hint="Pre-filled from the contract. Change only if the month was partial."
      />

      <TextField
        label="Invoice document link"
        name="document_url"
        defaultValue={invoice?.documentUrl}
        placeholder="https://drive.google.com/...invoice.pdf"
        hint="A link to the PDF. Direct file upload is not built into this dashboard yet."
      />

      <SelectField
        label="Submission status"
        name="status"
        defaultValue={invoice?.status ?? "draft"}
        options={[
          { value: "draft", label: "Draft" },
          { value: "submitted", label: "Submitted to Finance / Management" },
        ]}
        hint="The submission time is stamped by the database when this becomes Submitted."
      />

      <TextAreaField label="Notes" name="notes" defaultValue={invoice?.notes} />
    </RecordFormSheet>
  );
}
