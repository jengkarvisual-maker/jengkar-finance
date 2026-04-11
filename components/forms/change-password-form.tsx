"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { changePasswordAction } from "@/lib/actions/auth";
import {
  changePasswordSchema,
  type ChangePasswordSchema,
} from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm() {
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<ChangePasswordSchema>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setServerMessage(null);
    setIsSuccess(false);

    startTransition(async () => {
      const result = await changePasswordAction(values);

      if (!result.ok) {
        setServerMessage(result.message);

        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, messages]) => {
            if (!messages?.[0]) {
              return;
            }

            form.setError(field as keyof ChangePasswordSchema, {
              message: messages[0],
            });
          });
        }

        return;
      }

      form.reset();
      setIsSuccess(true);
      setServerMessage(result.message);
    });
  });

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Password saat ini</Label>
        <Input
          id="currentPassword"
          type="password"
          placeholder="Masukkan password saat ini"
          {...form.register("currentPassword")}
        />
        {form.formState.errors.currentPassword ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.currentPassword.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="newPassword">Password baru</Label>
        <Input
          id="newPassword"
          type="password"
          placeholder="Minimal 8 karakter"
          {...form.register("newPassword")}
        />
        {form.formState.errors.newPassword ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.newPassword.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Konfirmasi password baru</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="Ulangi password baru"
          {...form.register("confirmPassword")}
        />
        {form.formState.errors.confirmPassword ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.confirmPassword.message}
          </p>
        ) : null}
      </div>

      {serverMessage ? (
        <div
          className={
            isSuccess
              ? "rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
              : "rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700"
          }
        >
          {serverMessage}
        </div>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Menyimpan..." : "Perbarui password"}
      </Button>
    </form>
  );
}
