import { redirect } from "next/navigation";

type NewJobPageProps = {
  searchParams?: Promise<{
    propertyId?: string;
    scheduledDate?: string;
  }>;
};

export default async function NewCleaningJobPage({ searchParams }: NewJobPageProps) {
  const resolvedSearchParams = await searchParams;
  const params = new URLSearchParams({ addClean: "1" });

  if (resolvedSearchParams?.propertyId) {
    params.set("propertyId", resolvedSearchParams.propertyId);
  }

  if (resolvedSearchParams?.scheduledDate) {
    params.set("scheduledDate", resolvedSearchParams.scheduledDate);
  }

  redirect(`/admin/jobs?${params.toString()}`);
}
