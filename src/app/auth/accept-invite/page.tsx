import { AcceptInviteForm } from "@/components/AcceptInviteForm";

type AcceptInvitePageProps = {
  searchParams: Promise<{
    code?: string;
    error?: string;
    error_description?: string;
  }>;
};

export default async function AcceptInvitePage({ searchParams }: AcceptInvitePageProps) {
  const params = await searchParams;

  return (
    <AcceptInviteForm
      code={params.code}
      error={params.error_description ?? (params.error ? "This invite link could not be accepted." : undefined)}
    />
  );
}
