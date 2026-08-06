"use client";

import { useActionState } from "react";

import { saveCecChampion, type FormState } from "@/app/(dashboard)/actions";
import { CheckboxField, TextAreaField, TextField } from "@/components/ui/Field";
import { CEC_ONBOARDING_STEPS } from "@/lib/constants";
import type { CecChampion } from "@/lib/types";

import { RecordFormSheet } from "./RecordFormSheet";

/** Module 1 — CEC onboarding and relationship management. */
export function CecForm({
  open,
  onClose,
  cec,
}: {
  open: boolean;
  onClose: () => void;
  cec?: CecChampion | null;
}) {
  const [state, action] = useActionState<FormState, FormData>(
    saveCecChampion,
    {},
  );

  const FIELD_NAME: Record<(typeof CEC_ONBOARDING_STEPS)[number]["key"], string> =
    {
      briefingDone: "briefing_done",
      photoCaptured: "photo_captured",
      profileSecured: "profile_secured",
      handedToAdmin: "handed_to_admin",
    };

  return (
    <RecordFormSheet
      open={open}
      onClose={onClose}
      title={cec ? "Edit champion" : "Onboard a CEC"}
      subtitle="Community Engagement Champion intake and orientation. These details are confidential and visible only to the MEC module."
      action={action}
      state={state}
    >
      {cec ? <input type="hidden" name="id" value={cec.id} /> : null}

      <TextField
        label="CEC name"
        name="name"
        required
        defaultValue={cec?.name}
      />

      <TextField
        label="Contact number / details"
        name="contact_details"
        defaultValue={cec?.contactDetails}
        placeholder="012-345 6789"
      />

      <div>
        <p className="mb-2 text-xs font-medium text-ink-muted">
          Onboarding checklist
        </p>
        <div className="space-y-2">
          {CEC_ONBOARDING_STEPS.map((step) => (
            <CheckboxField
              key={step.key}
              label={step.label}
              name={FIELD_NAME[step.key]}
              hint={step.hint}
              defaultChecked={cec?.[step.key] ?? false}
            />
          ))}
        </div>
      </div>

      <TextField
        label="Onboarding completion date"
        name="onboarded_at"
        type="date"
        defaultValue={cec?.onboardedAt}
      />

      <TextAreaField label="Notes" name="notes" defaultValue={cec?.notes} />
    </RecordFormSheet>
  );
}
