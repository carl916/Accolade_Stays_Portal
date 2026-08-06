import { ArrowRight } from "lucide-react";
import Link from "next/link";

type RouteCardProps = {
  href: string;
  title: string;
  description: string;
};

export function RouteCard({ href, title, description }: RouteCardProps) {
  return (
    <Link
      href={href}
      className="group flex min-h-36 flex-col justify-between rounded-lg border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-moss hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-moss focus:ring-offset-2"
    >
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-brand-ink">{title}</h2>
        <p className="text-sm leading-6 text-stone-600">{description}</p>
      </div>
      <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-moss">
        Open
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </Link>
  );
}
