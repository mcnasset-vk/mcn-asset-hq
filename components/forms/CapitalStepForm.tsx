"use client";

import { useActionState } from "react";

import { saveCapitalStep, type FormState } from "@/app/(dashboard)/actions";
import { TextAreaField, TextField } from "@/components/ui/Field";
import type { CapitalStepProgress } from "@/lib/metrics";

import { RecordFormSheet } from "./RecordFormSheet";

/**
 * The plan against one step. There is no score field on purpose — a step's
 * standing is read from the pipeline, so the only thing to decide here is who
 * owns it and what they do next.
 */
export function CapitalStepForm({
  open,
  onClose,
  step,
}: {
  open: boolean;
  onClose: () => void;
  step?: CapitalStepProgress | null;
}) {
  const [state, action] = useActionState<FormState, FormData>(
    saveCapitalStep,
    {},
  );

  return (
    <RecordFormSheet
      open={open}
      onClose={onClose}
      title={step ? `${step.step}. ${step.zh} · ${step.label}` : "Step plan"}
      subtitle={
        step
          ? `${step.zhOutcome} — ${step.outcome}. Scored at ${Math.round(step.score * 100)}% from the records; only the plan is editable here.`
          : undefined
      }
      action={action}
      state={state}
    >
      {step ? <input type="hidden" name="key" value={step.key} /> : null}

      <TextField
        label="Owner"
        name="owner_name"
        defaultValue={step?.plan?.ownerName}
        placeholder="Who is accountable for this step"
      />

      <TextField
        label="Next action"
        name="focus"
        defaultValue={step?.plan?.focus}
        placeholder="The one thing that would move this step"
        hint={step ? `Measured by: ${step.proof.toLowerCase()}.` : undefined}
      />

      <TextField
        label="Target date"
        name="target_date"
        type="date"
        defaultValue={step?.plan?.targetDate}
        hint="When this step should be closed by."
      />

      <TextAreaField label="Notes" name="notes" defaultValue={step?.plan?.notes} />
    </RecordFormSheet>
  );
}
