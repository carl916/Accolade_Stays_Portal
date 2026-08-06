import { CheckCircle2, ClipboardList, Sparkles } from "lucide-react";
import { RouteCard } from "@/components/RouteCard";

const portalRoutes = [
  {
    href: "/admin",
    title: "Admin",
    description: "Create cleans, manage properties, and review exceptions."
  },
  {
    href: "/manager",
    title: "Manager",
    description: "Approve jobs, assign cleaners, and monitor progress."
  },
  {
    href: "/cleaner",
    title: "Cleaner",
    description: "View assigned cleans and complete mobile-first tasks."
  }
];

export default function HomePage() {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-6 rounded-lg border border-stone-200 bg-white p-6 shadow-sm sm:p-8 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-mint px-3 py-1 text-sm font-medium text-brand-moss">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Portal running
          </div>
          <div className="space-y-3">
            <h1 className="max-w-3xl text-3xl font-semibold tracking-normal text-brand-ink sm:text-4xl">
              Accolade Stays Operations Portal
            </h1>
            <p className="max-w-2xl text-base leading-7 text-stone-700">
              The application framework is ready for the cleaning operations workflow.
            </p>
          </div>
        </div>
        <div className="grid content-center gap-3 rounded-md bg-brand-linen p-4">
          <div className="flex items-center gap-3">
            <ClipboardList className="h-6 w-6 text-brand-moss" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-brand-ink">Initial scope</p>
              <p className="text-sm text-stone-600">Framework and placeholder routes only</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-brand-brass" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-brand-ink">Next phase</p>
              <p className="text-sm text-stone-600">Authentication, schema, and workflows</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {portalRoutes.map((route) => (
          <RouteCard key={route.href} {...route} />
        ))}
      </div>
    </section>
  );
}
