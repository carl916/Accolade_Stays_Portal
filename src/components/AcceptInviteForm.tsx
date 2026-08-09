"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { setInvitedUserPassword } from "@/lib/auth/actions";
import { setPasswordSchema, type SetPasswordFormValues } from "@/lib/auth/validation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type AcceptInviteFormProps = {
  code?: string;
  error?: string;
};

type InviteStatus = "checking" | "ready" | "error";

function getInviteHashSession() {
  if (typeof window === "undefined" || !window.location.hash) {
    return null;
  }

  const params = new URLSearchParams(window.location.hash.slice(1));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  if (!accessToken || !refreshToken) {
    return null;
  }

  return {
    access_token: accessToken,
    refresh_token: refreshToken
  };
}

export function AcceptInviteForm({ code, error }: AcceptInviteFormProps) {
  const [status, setStatus] = useState<InviteStatus>("checking");
  const [message, setMessage] = useState(error ?? "Checking your invite...");
  const [email, setEmail] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors }
  } = useForm<SetPasswordFormValues>({
    defaultValues: {
      password: "",
      confirmPassword: ""
    }
  });

  useEffect(() => {
    let isMounted = true;

    async function acceptInvite() {
      if (error) {
        setStatus("error");
        setMessage(error);
        return;
      }

      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut({ scope: "local" });

      const hashSession = getInviteHashSession();
      const result = hashSession
        ? await supabase.auth.setSession(hashSession)
        : code
          ? await supabase.auth.exchangeCodeForSession(code)
          : {
              data: { user: null },
              error: { message: "This invite link is missing its verification token." }
            };

      if (!isMounted) {
        return;
      }

      if (hashSession) {
        window.history.replaceState(null, document.title, window.location.pathname);
      }

      if (result.error || !result.data.user) {
        setStatus("error");
        setMessage(result.error?.message ?? "This invite link could not be accepted.");
        return;
      }

      setEmail(result.data.user.email ?? null);
      setStatus("ready");
      setMessage("Choose a password to finish setting up your account.");
    }

    void acceptInvite();

    return () => {
      isMounted = false;
    };
  }, [code, error]);

  function onSubmit(values: SetPasswordFormValues) {
    const parsed = setPasswordSchema.safeParse(values);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setError(issue?.path[0] === "confirmPassword" ? "confirmPassword" : "password", {
        message: issue?.message ?? "Check your password."
      });
      return;
    }

    startTransition(async () => {
      const result = await setInvitedUserPassword(parsed.data);

      if (result?.error) {
        setError("root", {
          message: result.error
        });
      }
    });
  }

  return (
    <section className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8 sm:px-6">
      <form onSubmit={handleSubmit(onSubmit)} className="rounded-lg border border-brand-border bg-white p-6 shadow-sm">
        <div className="mb-6 grid gap-4">
          <Image
            src="/brand/accolade-stays-logo.png"
            alt="Accolade Stays"
            width={267}
            height={70}
            priority
            className="h-auto w-[190px]"
          />
          <div>
            <h1 className="text-2xl font-semibold text-brand-ink">Set your password</h1>
            <p className="text-sm text-stone-600">{email ? `Invite accepted for ${email}.` : message}</p>
          </div>
        </div>

        {status === "ready" ? (
          <div className="grid gap-4">
            <label className="grid gap-2 text-sm font-medium text-brand-ink" htmlFor="password">
              Password
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.password)}
                className="min-h-12 rounded-md border border-brand-border bg-white px-3 text-base text-brand-ink outline-none transition focus:border-brand-focus focus:ring-2 focus:ring-brand-focus/30"
                {...register("password")}
              />
              {errors.password ? <span className="text-sm font-medium text-red-700">{errors.password.message}</span> : null}
            </label>

            <label className="grid gap-2 text-sm font-medium text-brand-ink" htmlFor="confirmPassword">
              Confirm password
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.confirmPassword)}
                className="min-h-12 rounded-md border border-brand-border bg-white px-3 text-base text-brand-ink outline-none transition focus:border-brand-focus focus:ring-2 focus:ring-brand-focus/30"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword ? (
                <span className="text-sm font-medium text-red-700">{errors.confirmPassword.message}</span>
              ) : null}
            </label>

            {errors.root ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {errors.root.message}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isPending}
              className="mt-2 min-h-12 rounded-md bg-brand-primary px-4 text-base font-semibold text-brand-primaryForeground transition hover:bg-brand-primaryHover focus:outline-none focus:ring-2 focus:ring-brand-focus focus:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
            >
              {isPending ? "Saving password..." : "Save password"}
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            <p
              className={`rounded-md border px-3 py-2 text-sm font-medium ${
                status === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-brand-border bg-brand-muted text-stone-700"
              }`}
            >
              {message}
            </p>
            {status === "error" ? (
              <Link
                href="/login"
                className="inline-flex min-h-12 items-center justify-center rounded-md bg-brand-primary px-4 text-base font-semibold text-brand-primaryForeground transition hover:bg-brand-primaryHover focus:outline-none focus:ring-2 focus:ring-brand-focus focus:ring-offset-2"
              >
                Go to sign in
              </Link>
            ) : null}
          </div>
        )}
      </form>
    </section>
  );
}
