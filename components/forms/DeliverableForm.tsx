"use client";

import { useActionState, useState } from "react";

import { saveDeliverable, type FormState } from "@/app/(dashboard)/actions";
import { useDashboard } from "@/components/providers/DashboardProvider";
import {
  CheckboxField,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/ui/Field";
import { DELIVERABLE_CATEGORIES } from "@/lib/constants";
import { formatRM } from "@/lib/format";
import type { Deliverable, DeliverableCategory } from "@/lib/types";

import { RecordFormSheet } from "./RecordFormSheet";

/**
 * Module 1 — the deliverable log.
 *
 * The four categories need genuinely different inputs, so the form reveals
 * only the fields that category bills on. Everything else stays null rather
 * than collecting data nobody will read.
 */
export function DeliverableForm({
  open,
  onClose,
  deliverable,
}: {
  open: boolean;
  onClose: () => void;
  deliverable?: Deliverable | null;
}) {
  // `now` comes from the server so the default date matches the server render.
  const { data, now } = useDashboard();
  const [state, action] = useActionState<FormState, FormData>(
    saveDeliverable,
    {},
  );
  const [category, setCategory] = useState<DeliverableCategory>(
    deliverable?.category ?? "edm_landing",
  );

  const rateCard = DELIVERABLE_CATEGORIES.find((c) => c.key === category)!;

  return (
    <RecordFormSheet
      open={open}
      onClose={onClose}
      title={deliverable ? "Edit deliverable" : "Log a deliverable"}
      subtitle={`Billed at ${formatRM(rateCard.rate)} per ${rateCard.unit}. The rate is stamped when the deliverable is created and never changes afterwards.`}
      action={action}
      state={state}
    >
      {deliverable ? (
        <input type="hidden" name="id" value={deliverable.id} />
      ) : null}

      {/* Controlled, because the category decides which fields appear below.
          A controlled select still submits its value normally. */}
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-ink-muted">
          Task category
        </span>
        <select
          name="category"
          value={category}
          onChange={(e) => setCategory(e.target.value as DeliverableCategory)}
          className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none"
        >
          {DELIVERABLE_CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label} — {formatRM(c.rate)} per {c.unit}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-[0.6875rem] text-ink-subtle">
          {rateCard.hint}
        </span>
      </label>

      <TextField
        label={
          category === "cec_profile"
            ? "CEC name"
            : category === "digital_access"
              ? "CEC / new member added"
              : category === "facebook_event"
                ? "Event title"
                : "Campaign title"
        }
        name="title"
        required
        defaultValue={deliverable?.title}
      />

      <TextField
        label={
          category === "cec_profile"
            ? "Publication date"
            : "Date created / uploaded"
        }
        name="occurred_on"
        type="date"
        defaultValue={deliverable?.occurredOn ?? now}
      />

      {category === "edm_landing" || category === "facebook_event" ? (
        <TextField
          label={category === "facebook_event" ? "Live post URL" : "Link URL"}
          name="link_url"
          defaultValue={deliverable?.linkUrl}
          placeholder="https://"
        />
      ) : null}

      {category === "facebook_event" ? (
        <TextAreaField
          label="Professional write-up"
          name="write_up"
          defaultValue={deliverable?.writeUp}
          hint="The copy that accompanied the post."
        />
      ) : null}

      {category === "cec_profile" ? (
        <>
          <TextField
            label="Platforms published"
            name="platforms"
            defaultValue={deliverable?.platforms}
            placeholder="Facebook, Instagram"
          />
          <SelectField
            label="Linked champion"
            name="cec_id"
            defaultValue={deliverable?.cecId ?? ""}
            options={[
              { value: "", label: "— not linked —" },
              ...data.cecs.map((c) => ({ value: c.id, label: c.name })),
            ]}
            hint="Links this upload to the champion the Operations Manager onboarded."
          />
        </>
      ) : null}

      {category === "digital_access" ? (
        <div className="space-y-2">
          <CheckboxField
            label="Google Calendar invitation sent"
            name="calendar_invited"
            defaultChecked={deliverable?.calendarInvited ?? false}
          />
          <CheckboxField
            label="WhatsApp channel integrated"
            name="whatsapp_integrated"
            defaultChecked={deliverable?.whatsappIntegrated ?? false}
          />
        </div>
      ) : null}

      <TextAreaField
        label="Notes"
        name="notes"
        defaultValue={deliverable?.notes}
      />
    </RecordFormSheet>
  );
}
