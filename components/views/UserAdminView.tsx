"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { saveUserAccess, type FormState } from "@/app/(dashboard)/actions";
import { PageHeader } from "@/components/layout/PageHeader";
import { useDashboard } from "@/components/providers/DashboardProvider";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { MODULE_LABELS } from "@/lib/constants";
import { JOB_TITLE_LABELS } from "@/lib/types";
import type { JobTitle, ModuleKey, Role, UserProfile } from "@/lib/types";

const ROLES: { value: Role; label: string; hint: string }[] = [
  { value: "super_admin", label: "Super admin", hint: "Sees everything" },
  { value: "cio", label: "CIO", hint: "One business line" },
  { value: "pending", label: "Pending", hint: "No access yet" },
];

const MODULES = Object.keys(MODULE_LABELS) as ModuleKey[];
const TITLES = Object.keys(JOB_TITLE_LABELS) as JobTitle[];

const ROLE_TONE = {
  super_admin: "accent",
  cio: "received",
  pending: "idle",
} as const;

export function UserAdminView({ profiles }: { profiles: UserProfile[] }) {
  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="User Access"
        description="Grant and change access for every account. A CIO must be scoped to exactly one business line; job titles apply only inside MEC Asset and decide which dashboard that person lands on."
      />

      <Card>
        <CardHeader
          title="Accounts"
          hint={`${profiles.length} ${profiles.length === 1 ? "account" : "accounts"} · changes take effect on the person's next page load`}
        />
        <ul className="divide-y divide-line">
          {profiles.map((p) => (
            <li key={p.id}>
              <UserRow profile={p} />
            </li>
          ))}
        </ul>
      </Card>

      <p className="mt-4 rounded-xl border border-line bg-surface-2 px-4 py-3 text-xs leading-relaxed text-ink-muted">
        Access is enforced in the database, not here. A CIO gets zero rows from
        every other business line even calling the API directly with their own
        token, so this page decides what someone is scoped to — never whether
        the hiding works. The last super admin cannot be demoted: the database
        refuses it, because otherwise nobody could manage roles again.
      </p>
    </>
  );
}

function UserRow({ profile }: { profile: UserProfile }) {
  const { profile: me } = useDashboard();
  const [state, action] = useActionState<FormState, FormData>(
    saveUserAccess,
    {},
  );

  const [role, setRole] = useState<Role>(profile.role);
  const [module, setModule] = useState<ModuleKey | "">(profile.module ?? "");
  const [jobTitle, setJobTitle] = useState<JobTitle | "">(
    profile.jobTitle ?? "",
  );

  const isSelf = profile.id === me.id;
  const dirty =
    role !== profile.role ||
    (module || null) !== profile.module ||
    (jobTitle || null) !== profile.jobTitle;

  return (
    <form action={action} className="px-5 py-4">
      <input type="hidden" name="id" value={profile.id} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
            {profile.fullName || profile.email}
            {isSelf ? (
              <Badge tone="accent" className="px-1.5 py-0.5 text-[0.625rem]">
                you
              </Badge>
            ) : null}
          </p>
          <p className="truncate text-xs text-ink-subtle">{profile.email}</p>
        </div>
        <Badge tone={ROLE_TONE[profile.role]} dot>
          {profile.role === "cio" && profile.module
            ? MODULE_LABELS[profile.module]
            : ROLES.find((r) => r.value === profile.role)?.label}
        </Badge>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-muted">
            Role
          </span>
          <select
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label} — {r.hint}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-muted">
            Business line
          </span>
          <select
            name="module"
            value={module}
            onChange={(e) => setModule(e.target.value as ModuleKey | "")}
            disabled={role !== "cio"}
            className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none disabled:opacity-50"
          >
            <option value="">— none —</option>
            {MODULES.map((m) => (
              <option key={m} value={m}>
                {MODULE_LABELS[m]}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-muted">
            Job title
          </span>
          <select
            name="job_title"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value as JobTitle | "")}
            disabled={role !== "cio" || module !== "mec"}
            className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none disabled:opacity-50"
          >
            <option value="">— standard module view —</option>
            {TITLES.map((t) => (
              <option key={t} value={t}>
                {JOB_TITLE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {role === "cio" && !module ? (
        <p className="mt-2 text-xs text-risk">
          Pick a business line — a CIO scoped to nothing would see nothing.
        </p>
      ) : null}

      {isSelf && role !== "super_admin" ? (
        <p className="mt-2 text-xs text-risk">
          This is your own account. Removing your super admin role will end your
          access to this page.
        </p>
      ) : null}

      {state.error ? (
        <p role="alert" className="mt-2 text-xs text-stalled">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="mt-2 text-xs text-received">Saved.</p>
      ) : null}

      <div className="mt-3 flex justify-end">
        <SaveButton disabled={!dirty || (role === "cio" && !module)} />
      </div>
    </form>
  );
}

function SaveButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
    >
      {pending ? "Saving…" : "Save changes"}
    </button>
  );
}
