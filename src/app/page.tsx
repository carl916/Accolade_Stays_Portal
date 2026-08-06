import { redirect } from "next/navigation";
import { SignInExperience } from "@/components/SignInExperience";
import { getCurrentProfile } from "@/lib/auth/session";
import { getRoleHomePath } from "@/lib/domain/operations";

export default async function HomePage() {
  const profile = await getCurrentProfile();

  if (profile) {
    redirect(getRoleHomePath(profile.role));
  }

  return <SignInExperience />;
}
