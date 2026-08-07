"use client";

import { useActionState } from "react";

import { saveMicanaTenant, type FormState } from "@/app/(dashboard)/actions";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { MICANA_TENANT_STATUSES } from "@/lib/constants";
import type { MicanaBungalow, MicanaTenant } from "@/lib/types";

import { RecordFormSheet } from "./RecordFormSheet";

export function MicanaTenantForm({
  open,
  onClose,
  tenant,
  bungalows,
}: {
  open: boolean;
  onClose: () => void;
  tenant?: MicanaTenant | null;
  bungalows: MicanaBungalow[];
}) {
  const [state, action] = useActionState<FormState, FormData>(
    saveMicanaTenant,
    {},
  );

  return (
    <RecordFormSheet
      open={open}
      onClose={onClose}
      title={tenant ? "Edit tenant" : "Add tenant"}
      subtitle="One tenancy, one room. Occupied and under-notice rooms are the ones counted as filled."
      action={action}
      state={state}
    >
      {tenant ? <input type="hidden" name="id" value={tenant.id} /> : null}

      <SelectField
        label="Bungalow"
        name="bungalow_id"
        defaultValue={tenant?.bungalowId ?? bungalows[0]?.id}
        options={bungalows.map((b) => ({
          value: b.id,
          label: b.bungalowName,
        }))}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Tenant name"
          name="tenant_name"
          required
          defaultValue={tenant?.tenantName}
        />
        <TextField
          label="Telephone"
          name="phone"
          type="tel"
          defaultValue={tenant?.phone}
          placeholder="012-345 6789"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Room"
          name="room_label"
          required
          defaultValue={tenant?.roomLabel}
          placeholder="Room 1"
          hint="Aircon readings are matched to the room by this exact label."
        />
        <SelectField
          label="Status"
          name="status"
          defaultValue={tenant?.status ?? "enquiry"}
          options={MICANA_TENANT_STATUSES.map((s) => ({
            value: s.key,
            label: s.label,
          }))}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Monthly rent (RM)"
          name="monthly_rent"
          type="number"
          defaultValue={String(tenant?.monthlyRent ?? 0)}
        />
        <TextField
          label="Deposit (RM)"
          name="deposit"
          type="number"
          defaultValue={String(tenant?.deposit ?? 0)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Moved in"
          name="moved_in_at"
          type="date"
          defaultValue={tenant?.movedInAt}
        />
        <TextField
          label="Moved out"
          name="moved_out_at"
          type="date"
          defaultValue={tenant?.movedOutAt}
        />
      </div>

      <TextField
        label="Aircon included (kWh/month)"
        name="aircon_allowance_kwh"
        type="number"
        defaultValue={
          tenant?.airconAllowanceKwh === null ||
          tenant?.airconAllowanceKwh === undefined
            ? ""
            : String(tenant.airconAllowanceKwh)
        }
        hint="Leave blank to inherit the bungalow's house allowance. A zero here bills the tenant from the first kWh."
      />

      <TextAreaField label="Notes" name="notes" defaultValue={tenant?.notes} />
    </RecordFormSheet>
  );
}
