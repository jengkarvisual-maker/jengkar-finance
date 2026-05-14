"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { loginAction } from "@/lib/actions/auth";
import { loginSchema, type LoginSchema } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setServerMessage(null);

    startTransition(async () => {
      const result = await loginAction(values);

      if (!result.ok) {
        setServerMessage(result.message);
        return;
      }

      router.push(result.data?.redirectTo ?? "/dashboard");
      router.refresh();
    });
  });

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
        <div>
          <label className="sr-only" htmlFor="email">
            Email
          </label>
          <Input
            id="email"
            type="email"
            placeholder="Email"
            className="h-14 rounded-full bg-white px-5 text-base"
            {...form.register("email")}
          />
          {form.formState.errors.email ? (
            <p className="mt-2 text-sm text-destructive">
              {form.formState.errors.email.message}
            </p>
          ) : null}
        </div>

        <div>
          <label className="sr-only" htmlFor="password">
            Password
          </label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className="h-14 rounded-full bg-white px-5 pr-28 text-base"
              {...form.register("password")}
            />
            <button
              type="button"
              aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              className="button-press absolute right-2 top-1/2 inline-flex h-10 -translate-y-1/2 items-center justify-center rounded-full border border-border/70 bg-white/80 px-4 text-xs font-semibold text-foreground transition hover:border-primary/25 hover:bg-white"
              onClick={() => setShowPassword((current) => !current)}
              disabled={isPending}
            >
              {showPassword ? "Sembunyikan" : "Lihat"}
            </button>
          </div>
          {form.formState.errors.password ? (
            <p className="mt-2 text-sm text-destructive">
              {form.formState.errors.password.message}
            </p>
          ) : null}
        </div>
      </div>

      {serverMessage ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {serverMessage}
        </div>
      ) : null}

      <Button className="h-14 w-full rounded-full text-base" type="submit" disabled={isPending}>
        {isPending ? "Memverifikasi..." : "Masuk ke akun"}
      </Button>
    </form>
  );
}
