import { PlaceholderPage } from "@/components/PlaceholderPage";
import { requireRole } from "@/lib/auth/session";

export default async function ManagerPage() {
  const profile = await requireRole(["cleaning_manager"]);

  return (
    <PlaceholderPage
      eyebrow="Cleaning manager"
      title="Manager workspace"
      description="Approve proposed cleans, assign cleaners, and review linen and long-clean reports."
      nextAction={`Signed in as ${profile.full_name}. Approval and assignment workflows are next.`}
    />
  );
}
