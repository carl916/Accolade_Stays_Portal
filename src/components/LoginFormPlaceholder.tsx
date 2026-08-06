import { LogIn } from "lucide-react";

export function LoginFormPlaceholder() {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-brand-mint text-brand-moss">
          <LogIn className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-brand-ink">Sign in</h1>
          <p className="text-sm text-stone-600">Authentication will be connected in a later step.</p>
        </div>
      </div>
      <div className="grid gap-4">
        <label className="grid gap-2 text-sm font-medium text-brand-ink" htmlFor="email">
          Email
          <input
            id="email"
            name="email"
            type="email"
            disabled
            placeholder="name@example.com"
            className="min-h-12 rounded-md border border-stone-300 bg-stone-50 px-3 text-base text-stone-500"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-brand-ink" htmlFor="password">
          Password
          <input
            id="password"
            name="password"
            type="password"
            disabled
            placeholder="Password"
            className="min-h-12 rounded-md border border-stone-300 bg-stone-50 px-3 text-base text-stone-500"
          />
        </label>
        <button
          type="button"
          disabled
          className="mt-2 min-h-12 rounded-md bg-brand-moss px-4 text-base font-semibold text-white opacity-70"
        >
          Sign in unavailable
        </button>
      </div>
    </div>
  );
}
