import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { getCurrentProfile } from "@/lib/auth/session";
import { getRoleHomePath } from "@/lib/domain/operations";

export default async function LoginPage() {
  const profile = await getCurrentProfile();

  if (profile) {
    redirect(getRoleHomePath(profile.role));
  }

  return (
    <section className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8">
      <LoginForm />
    </section>
  );
}
