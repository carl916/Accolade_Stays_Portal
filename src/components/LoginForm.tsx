"use client";

import Image from "next/image";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { signInWithPassword } from "@/lib/auth/actions";
import { signInSchema, type SignInFormValues } from "@/lib/auth/validation";

export function LoginForm() {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors }
  } = useForm<SignInFormValues>({
    defaultValues: {
      email: "",
      password: ""
    }
  });

  function onSubmit(values: SignInFormValues) {
    const parsed = signInSchema.safeParse(values);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setError(issue?.path[0] === "password" ? "password" : "email", {
        message: issue?.message ?? "Check your sign-in details."
      });
      return;
    }

    startTransition(async () => {
      const result = await signInWithPassword(parsed.data);

      if (result?.error) {
        setError("root", {
          message: result.error
        });
      }
    });
  }

  return (
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
          <h1 className="text-2xl font-semibold text-brand-ink">Operations Portal</h1>
          <p className="text-sm text-stone-600">Sign in to manage cleaning operations.</p>
        </div>
      </div>

      <div className="grid gap-4">
        <label className="grid gap-2 text-sm font-medium text-brand-ink" htmlFor="email">
          Email
          <input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            className="min-h-12 rounded-md border border-brand-border bg-white px-3 text-base text-brand-ink outline-none transition focus:border-brand-focus focus:ring-2 focus:ring-brand-focus/30"
            {...register("email")}
          />
          {errors.email ? <span className="text-sm font-medium text-red-700">{errors.email.message}</span> : null}
        </label>

        <label className="grid gap-2 text-sm font-medium text-brand-ink" htmlFor="password">
          Password
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            className="min-h-12 rounded-md border border-brand-border bg-white px-3 text-base text-brand-ink outline-none transition focus:border-brand-focus focus:ring-2 focus:ring-brand-focus/30"
            {...register("password")}
          />
          {errors.password ? <span className="text-sm font-medium text-red-700">{errors.password.message}</span> : null}
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
          {isPending ? "Signing in..." : "Sign in"}
        </button>
      </div>
    </form>
  );
}
