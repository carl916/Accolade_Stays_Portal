import { PlaceholderPage } from "@/components/PlaceholderPage";
import { requireRole } from "@/lib/auth/session";

export default async function CleanerPage() {
  const profile = await requireRole(["cleaner"]);

  return (
    <PlaceholderPage
      eyebrow="Cleaner"
      title="Cleaner workspace"
      description="View assigned cleaning jobs, accept work, start cleans, and complete required reports."
      nextAction={`Signed in as ${profile.full_name}. Assigned job lists and acceptance are next.`}
    />
  );
}
