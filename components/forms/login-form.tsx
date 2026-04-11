"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { loginAction } from "@/lib/actions/auth";
import { loginSchema, type LoginSchema } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isProduction = process.env.NODE_ENV === "production";

  const form = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const helperText = useMemo(
    () =>
      isProduction
        ? "Gunakan email dan password internal yang diberikan khusus untuk tim Rumah Jengkar."
        : "Gunakan akun internal. Untuk environment dev, akun seed owner, admin, dan finance staff tersedia di README.",
    [isProduction],
  );

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
    <Card className="w-full max-w-md border-border/70 bg-card/90">
      <CardHeader className="space-y-3">
        <div className="metric-chip">Internal Access</div>
        <CardTitle>Masuk ke RUMAH JENGKAR FINANCE</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">{helperText}</p>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="owner@rumahjengkar.id"
              {...form.register("email")}
            />
            {form.formState.errors.email ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.email.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Masukkan password"
              {...form.register("password")}
            />
            {form.formState.errors.password ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.password.message}
              </p>
            ) : null}
          </div>

          {serverMessage ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {serverMessage}
            </div>
          ) : null}

          <Button className="w-full" type="submit" disabled={isPending}>
            {isPending ? "Memverifikasi..." : "Masuk ke dashboard"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
