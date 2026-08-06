import { PlaceholderPage } from "@/components/PlaceholderPage";
import { requireRole } from "@/lib/auth/session";

export default async function AdminPage() {
  const profile = await requireRole(["administrator"]);

  return (
    <PlaceholderPage
      eyebrow="Administrator"
      title="Admin workspace"
      description="Create cleaning jobs, manage properties, and review operational exceptions."
      nextAction={`Signed in as ${profile.full_name}. Property and bedroom management are next.`}
    />
  );
}
