import { CalendarDays, CircleDashed, MapPin, MoveRight } from "lucide-react";
import { format } from "date-fns";

type PlaceholderPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  nextAction: string;
};

export function PlaceholderPage({ eyebrow, title, description, nextAction }: PlaceholderPageProps) {
  const today = format(new Date(), "d MMM yyyy");

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-normal text-brand-moss">{eyebrow}</p>
        <h1 className="mt-3 text-3xl font-semibold text-brand-ink">{title}</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-stone-700">{description}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-start gap-3 rounded-lg border border-stone-200 bg-white p-4">
          <MapPin className="mt-0.5 h-5 w-5 text-brand-moss" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-brand-ink">Property</p>
            <p className="text-sm text-stone-600">St Andrews, Brahms, Rossini</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-lg border border-stone-200 bg-white p-4">
          <CalendarDays className="mt-0.5 h-5 w-5 text-brand-moss" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-brand-ink">Date</p>
            <p className="text-sm text-stone-600">{today}</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-lg border border-stone-200 bg-white p-4">
          <CircleDashed className="mt-0.5 h-5 w-5 text-brand-moss" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-brand-ink">Current status</p>
            <p className="text-sm text-stone-600">Framework placeholder</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-lg border border-stone-200 bg-white p-4">
          <MoveRight className="mt-0.5 h-5 w-5 text-brand-moss" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-brand-ink">Next action</p>
            <p className="text-sm text-stone-600">{nextAction}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
