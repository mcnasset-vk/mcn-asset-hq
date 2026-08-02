"use client";

import { useActionState } from "react";

import { saveMdnaMember, type FormState } from "@/app/(dashboard)/actions";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { MDNA_STATUSES } from "@/lib/constants";
import type { MdnaMember } from "@/lib/types";

import { RecordFormSheet } from "./RecordFormSheet";

export function MdnaForm({
  open,
  onClose,
  member,
}: {
  open: boolean;
  onClose: () => void;
  member?: MdnaMember | null;
}) {
  const [state, action] = useActionState<FormState, FormData>(
    saveMdnaMember,
    {},
  );

  return (
    <RecordFormSheet
      open={open}
      onClose={onClose}
      title={member ? "Edit member" : "Add member"}
      subtitle="RM500,000 Senior Co-Living package, of which RM50,000 is invested into MCN Asset HQ."
      action={action}
      state={state}
    >
      {member ? <input type="hidden" name="id" value={member.id} /> : null}

      <TextField
        label="Member name"
        name="member_name"
        required
        defaultValue={member?.memberName}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Telephone"
          name="phone"
          type="tel"
          defaultValue={member?.phone}
          placeholder="012-345 6789"
        />
        <TextField
          label="Referred by"
          name="referrer"
          defaultValue={member?.referrer}
        />
      </div>

      <SelectField
        label="Status"
        name="status"
        defaultValue={member?.status ?? "prospect"}
        options={MDNA_STATUSES.map((s) => ({ value: s.key, label: s.label }))}
        hint="Only 'Invested into HQ' counts toward the RM20M received figure."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Agreement signed"
          name="signed_at"
          type="date"
          defaultValue={member?.signedAt}
        />
        <TextField
          label="Package paid"
          name="paid_at"
          type="date"
          defaultValue={member?.paidAt}
        />
        <TextField
          label="RM50k into HQ on"
          name="invested_at"
          type="date"
          defaultValue={member?.investedAt}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Package amount (RM)"
          name="package_amount"
          type="number"
          defaultValue={String(member?.packageAmount ?? 500000)}
        />
        <TextField
          label="Into HQ (RM)"
          name="hq_investment_amount"
          type="number"
          defaultValue={String(member?.hqInvestmentAmount ?? 50000)}
        />
      </div>

      <TextAreaField label="Notes" name="notes" defaultValue={member?.notes} />
    </RecordFormSheet>
  );
}
