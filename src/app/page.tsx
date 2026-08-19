import { redirect } from "next/navigation";
import { SignInExperience } from "@/components/SignInExperience";
import { buildInviteAcceptRedirect, shouldRedirectToInviteAccept } from "@/lib/auth/invite-links";
import { getCurrentProfile } from "@/lib/auth/session";
import { getRoleHomePath } from "@/lib/domain/operations";

type HomePageProps = {
  searchParams: Promise<{
    code?: string;
    error?: string;
    error_description?: string;
    type?: string;
    token_hash?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;

  if (shouldRedirectToInviteAccept(params)) {
    redirect(buildInviteAcceptRedirect(params));
  }

  const profile = await getCurrentProfile();

  if (profile) {
    redirect(getRoleHomePath(profile.role));
  }

  return <SignInExperience />;
}
