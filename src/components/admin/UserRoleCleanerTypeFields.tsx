"use client";

import { useState } from "react";
import { appRoles, cleanerTypes, getCleanerTypeLabel, type AppRole, type CleanerType } from "@/lib/domain/operations";

type UserRoleCleanerTypeFieldsProps = {
  roleLabels: Record<AppRole, string>;
  defaultRole?: AppRole;
  defaultCleanerType?: CleanerType | null;
};

export function UserRoleCleanerTypeFields({
  roleLabels,
  defaultRole = "cleaner",
  defaultCleanerType = "individual"
}: UserRoleCleanerTypeFieldsProps) {
  const [role, setRole] = useState<AppRole>(defaultRole);
  const isCleaner = role === "cleaner";
  const fieldClass = "grid min-w-0 gap-1.5 text-sm font-medium text-brand-ink";
  const controlClass =
    "min-h-11 w-full min-w-0 rounded-md border border-brand-border bg-white px-3 text-base outline-none focus:border-brand-focus focus:ring-2 focus:ring-brand-focus/30";

  return (
    <>
      <label className={fieldClass}>
        Role
        <select
          name="role"
          value={role}
          onChange={(event) => setRole(event.target.value as AppRole)}
          className={controlClass}
        >
          {appRoles.map((appRole) => (
            <option key={appRole} value={appRole}>
              {roleLabels[appRole]}
            </option>
          ))}
        </select>
      </label>
      {isCleaner ? (
        <label className={fieldClass}>
          Cleaner type
          <select
            name="cleanerType"
            defaultValue={defaultCleanerType ?? "individual"}
            className={controlClass}
          >
            {cleanerTypes.map((cleanerType) => (
              <option key={cleanerType} value={cleanerType}>
                {getCleanerTypeLabel(cleanerType)}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <input type="hidden" name="cleanerType" value="" />
      )}
    </>
  );
}
