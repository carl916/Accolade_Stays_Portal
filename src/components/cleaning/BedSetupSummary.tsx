import { AlertTriangle, BedDouble } from "lucide-react";
import {
  formatBedConfiguration,
  getBedConfigurationAction,
  type BedConfiguration
} from "@/lib/domain/operations";

export type BedSetupSummaryBedroom = {
  id: string;
  name: string;
  currentConfiguration: BedConfiguration;
  requiredConfiguration: BedConfiguration;
};

type BedSetupSummaryProps = {
  bedrooms: BedSetupSummaryBedroom[];
  title?: string;
  compact?: boolean;
};

export function getChangedBedSetupRooms(bedrooms: BedSetupSummaryBedroom[]) {
  return bedrooms.filter((bedroom) => bedroom.currentConfiguration !== bedroom.requiredConfiguration);
}

export function BedSetupSummary({ bedrooms, title = "Bed setup", compact = false }: BedSetupSummaryProps) {
  const changedBedrooms = getChangedBedSetupRooms(bedrooms);
  const unchangedBedrooms = bedrooms.filter((bedroom) => bedroom.currentConfiguration === bedroom.requiredConfiguration);

  if (bedrooms.length === 0) {
    return (
      <section className="grid gap-2 rounded-md border border-brand-border bg-white p-3">
        <h2 className="text-base font-semibold text-brand-ink">{title}</h2>
        <p className="text-sm text-stone-600">No bedroom setup has been recorded for this clean.</p>
      </section>
    );
  }

  if (changedBedrooms.length === 0) {
    return (
      <section className="grid gap-3 rounded-md border border-brand-border bg-white p-3">
        <div className="flex items-center gap-2">
          <BedDouble className="h-4 w-4 text-brand-darkSlate" aria-hidden="true" />
          <h2 className="text-base font-semibold text-brand-ink">{title}</h2>
        </div>
        <div className="grid gap-1">
          {bedrooms.map((bedroom) => (
            <div key={bedroom.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 text-sm">
              <span className="truncate font-medium text-brand-ink">{bedroom.name}</span>
              <span className="font-semibold text-stone-700">{formatBedConfiguration(bedroom.currentConfiguration)}</span>
            </div>
          ))}
        </div>
        <p className="text-sm text-stone-600">All beds remain in their current configuration.</p>
      </section>
    );
  }

  return (
    <section className="grid gap-3 rounded-md border border-brand-border bg-white p-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-700" aria-hidden="true" />
        <h2 className="text-base font-semibold text-brand-ink">{title}</h2>
      </div>
      <div className="grid gap-2">
        {changedBedrooms.map((bedroom) => (
          <div key={bedroom.id} className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-normal text-amber-900">Bed change required</p>
            <p className="mt-1 text-sm font-semibold text-brand-ink">{bedroom.name}</p>
            <p className="mt-1 text-lg font-semibold text-amber-950">
              {formatBedConfiguration(bedroom.currentConfiguration)} -&gt;{" "}
              {formatBedConfiguration(bedroom.requiredConfiguration)}
            </p>
            <p className="text-sm font-semibold text-amber-900">
              {getBedConfigurationAction({
                currentConfiguration: bedroom.currentConfiguration,
                requiredConfiguration: bedroom.requiredConfiguration
              })}
            </p>
          </div>
        ))}
      </div>

      {unchangedBedrooms.length > 0 ? (
        <div className={`grid gap-1 ${compact ? "" : "border-t border-brand-border pt-2"}`}>
          {unchangedBedrooms.map((bedroom) => (
            <p key={bedroom.id} className="truncate text-sm text-stone-600">
              {bedroom.name} - {formatBedConfiguration(bedroom.currentConfiguration)}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
