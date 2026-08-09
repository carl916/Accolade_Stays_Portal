"use client";

import { Pencil, Plus, Save, Users, X } from "lucide-react";
import { useId, useState } from "react";
import { inviteUser, updateUserProfile } from "@/lib/admin/user-actions";
import { getCleanerTypeLabel, type AppRole, type CleanerType } from "@/lib/domain/operations";
import { FormSubmitButton } from "@/components/admin/FormSubmitButton";
import { UserRoleCleanerTypeFields } from "@/components/admin/UserRoleCleanerTypeFields";

export type UserAdminProfile = {
  id: string;
  email: string | null;
  full_name: string;
  role: AppRole;
  cleaner_type: CleanerType | null;
  is_active: boolean;
};

const roleLabels = {
  administrator: "Administrator",
  cleaning_manager: "Cleaning Manager",
  cleaner: "Cleaner"
} satisfies Record<AppRole, string>;

const actionButtonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-brand-border bg-white px-3 text-sm font-semibold text-brand-ink transition hover:border-brand-slate hover:bg-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-focus focus:ring-offset-2";

const iconButtonClass =
  "inline-flex h-10 w-10 items-center justify-center rounded-md border border-brand-border bg-white text-brand-primary transition hover:border-brand-slate hover:bg-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-focus focus:ring-offset-2";

function formatCleanerType(cleanerType: CleanerType | null) {
  return cleanerType ? getCleanerTypeLabel(cleanerType) : "-";
}

function StatusPill({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
        isActive ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-600"
      }`}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

type UserAdminPanelProps = {
  profiles: UserAdminProfile[];
};

export function UserAdminPanel({ profiles }: UserAdminPanelProps) {
  const addFormId = useId();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);

  function toggleInviteForm() {
    setIsInviteOpen((current) => !current);
    setEditingProfileId(null);
  }

  function toggleEditForm(profileId: string) {
    setEditingProfileId((current) => (current === profileId ? null : profileId));
    setIsInviteOpen(false);
  }

  return (
    <section className="overflow-hidden rounded-lg border border-brand-border bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-brand-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid gap-1">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-brand-moss" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-brand-ink">Access & users</h2>
          </div>
          <p className="text-sm text-stone-600">Manage invites, roles and account status.</p>
        </div>
        <button
          type="button"
          aria-expanded={isInviteOpen}
          aria-controls={addFormId}
          onClick={toggleInviteForm}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-brand-primary px-4 text-sm font-semibold text-brand-primaryForeground transition hover:bg-brand-primaryHover focus:outline-none focus:ring-2 focus:ring-brand-focus focus:ring-offset-2 sm:w-auto"
        >
          {isInviteOpen ? <X className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
          {isInviteOpen ? "Close" : "Add user"}
        </button>
      </div>

      {isInviteOpen ? (
        <form
          id={addFormId}
          action={inviteUser}
          className="grid gap-3 border-b border-brand-border bg-brand-muted/60 px-4 py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(11rem,0.7fr)_minmax(11rem,0.7fr)_auto_auto] md:items-end"
        >
          <label className="grid gap-1.5 text-sm font-medium text-brand-ink">
            Name
            <input
              name="fullName"
              required
              className="min-h-11 rounded-md border border-brand-border bg-white px-3 text-base outline-none focus:border-brand-focus focus:ring-2 focus:ring-brand-focus/30"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-brand-ink">
            Email
            <input
              name="email"
              type="email"
              required
              className="min-h-11 rounded-md border border-brand-border bg-white px-3 text-base outline-none focus:border-brand-focus focus:ring-2 focus:ring-brand-focus/30"
            />
          </label>
          <UserRoleCleanerTypeFields roleLabels={roleLabels} defaultRole="cleaner" defaultCleanerType="individual" />
          <FormSubmitButton pendingLabel="Inviting..." className="md:w-auto">
            <span className="inline-flex items-center gap-2">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Invite
            </span>
          </FormSubmitButton>
          <button type="button" onClick={() => setIsInviteOpen(false)} className={actionButtonClass}>
            <X className="h-4 w-4" aria-hidden="true" />
            Cancel
          </button>
        </form>
      ) : null}

      <div className="grid">
        <div className="hidden grid-cols-[minmax(13rem,1.4fr)_minmax(10rem,0.8fr)_minmax(8rem,0.6fr)_minmax(10rem,0.8fr)_3rem] gap-3 border-b border-brand-border px-4 py-2 text-xs font-semibold uppercase tracking-normal text-stone-500 lg:grid">
          <span>Person</span>
          <span>Role</span>
          <span>Status</span>
          <span>Cleaner type</span>
          <span className="text-right">Edit</span>
        </div>

        {profiles.map((profile) => {
          const isEditing = editingProfileId === profile.id;

          return (
            <div key={profile.id} className="border-b border-brand-border last:border-b-0">
              <div className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(13rem,1.4fr)_minmax(10rem,0.8fr)_minmax(8rem,0.6fr)_minmax(10rem,0.8fr)_3rem] lg:items-center">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-brand-ink">{profile.full_name}</p>
                  <p className="truncate text-sm text-stone-600">{profile.email ?? "No email recorded"}</p>
                </div>
                <div className="flex items-center justify-between gap-3 lg:block">
                  <span className="text-xs font-semibold uppercase tracking-normal text-stone-500 lg:hidden">Role</span>
                  <span className="text-sm text-brand-ink">{roleLabels[profile.role]}</span>
                </div>
                <div className="flex items-center justify-between gap-3 lg:block">
                  <span className="text-xs font-semibold uppercase tracking-normal text-stone-500 lg:hidden">Status</span>
                  <StatusPill isActive={profile.is_active} />
                </div>
                <div className="flex items-center justify-between gap-3 lg:block">
                  <span className="text-xs font-semibold uppercase tracking-normal text-stone-500 lg:hidden">Cleaner type</span>
                  <span className="text-sm text-stone-700">{profile.role === "cleaner" ? formatCleanerType(profile.cleaner_type) : "-"}</span>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    aria-label={`Edit ${profile.full_name}`}
                    aria-expanded={isEditing}
                    onClick={() => toggleEditForm(profile.id)}
                    className={iconButtonClass}
                  >
                    {isEditing ? <X className="h-4 w-4" aria-hidden="true" /> : <Pencil className="h-4 w-4" aria-hidden="true" />}
                  </button>
                </div>
              </div>

              {isEditing ? (
                <form
                  action={updateUserProfile}
                  className="grid gap-3 border-t border-brand-border bg-brand-muted/60 px-4 py-4 md:grid-cols-[minmax(0,1.2fr)_minmax(11rem,0.7fr)_minmax(11rem,0.7fr)_minmax(9rem,0.6fr)_auto_auto] md:items-end"
                >
                  <input type="hidden" name="profileId" value={profile.id} />
                  <label className="grid gap-1.5 text-sm font-medium text-brand-ink">
                    Name
                    <input
                      name="fullName"
                      defaultValue={profile.full_name}
                      required
                      className="min-h-11 rounded-md border border-brand-border bg-white px-3 text-base outline-none focus:border-brand-focus focus:ring-2 focus:ring-brand-focus/30"
                    />
                  </label>
                  <UserRoleCleanerTypeFields
                    roleLabels={roleLabels}
                    defaultRole={profile.role}
                    defaultCleanerType={profile.cleaner_type}
                  />
                  <label className="grid gap-1.5 text-sm font-medium text-brand-ink">
                    Status
                    <select
                      name="isActive"
                      defaultValue={profile.is_active ? "active" : "inactive"}
                      className="min-h-11 rounded-md border border-brand-border bg-white px-3 text-base outline-none focus:border-brand-focus focus:ring-2 focus:ring-brand-focus/30"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </label>
                  <FormSubmitButton pendingLabel="Saving..." className="md:w-auto">
                    <span className="inline-flex items-center gap-2">
                      <Save className="h-4 w-4" aria-hidden="true" />
                      Save
                    </span>
                  </FormSubmitButton>
                  <button type="button" onClick={() => setEditingProfileId(null)} className={actionButtonClass}>
                    <X className="h-4 w-4" aria-hidden="true" />
                    Cancel
                  </button>
                </form>
              ) : null}
            </div>
          );
        })}

        {profiles.length === 0 ? (
          <p className="px-4 py-5 text-sm text-stone-600">No users found.</p>
        ) : null}
      </div>
    </section>
  );
}
