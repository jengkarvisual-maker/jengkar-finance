"use client";

import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { resetUserPasswordAction } from "@/lib/actions/auth";
import {
  resetUserPasswordSchema,
  type ResetUserPasswordSchema,
} from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ResettableUser = {
  id: string;
  name: string;
  email: string;
  roleName: string;
  roleKey: string;
  status: string;
};

type ResetUserPasswordFormProps = {
  users: ResettableUser[];
};

export function ResetUserPasswordForm({
  users,
}: ResetUserPasswordFormProps) {
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<ResetUserPasswordSchema>({
    resolver: zodResolver(resetUserPasswordSchema),
    defaultValues: {
      userId: users[0]?.id ?? "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const selectedUserId = useWatch({
    control: form.control,
    name: "userId",
  });
  const selectedUser =
    users.find((item) => item.id === selectedUserId) ?? null;

  const onSubmit = form.handleSubmit((values) => {
    setServerMessage(null);
    setIsSuccess(false);

    startTransition(async () => {
      const result = await resetUserPasswordAction(values);

      if (!result.ok) {
        setServerMessage(result.message);

        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, messages]) => {
            if (!messages?.[0]) {
              return;
            }

            form.setError(field as keyof ResetUserPasswordSchema, {
              message: messages[0],
            });
          });
        }

        return;
      }

      form.reset({
        userId: values.userId,
        newPassword: "",
        confirmPassword: "",
      });
      setIsSuccess(true);
      setServerMessage(result.message);
    });
  });

  if (users.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 bg-white/70 px-4 py-5 text-sm text-muted-foreground">
        Belum ada user lain yang bisa kamu reset dari akun ini.
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className="space-y-2">
        <Label htmlFor="userId">Pilih user</Label>
        <select
          id="userId"
          className="flex h-11 w-full rounded-2xl border border-input bg-white/80 px-4 py-2 text-sm text-foreground shadow-sm outline-none"
          {...form.register("userId")}
        >
          {users.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} - {item.roleName}
            </option>
          ))}
        </select>
        {selectedUser ? (
          <p className="text-sm text-muted-foreground">
            {selectedUser.email} · {selectedUser.status}
          </p>
        ) : null}
        {form.formState.errors.userId ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.userId.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="resetNewPassword">Password baru sementara</Label>
        <Input
          id="resetNewPassword"
          type="password"
          placeholder="Masukkan password sementara"
          {...form.register("newPassword")}
        />
        {form.formState.errors.newPassword ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.newPassword.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="resetConfirmPassword">Konfirmasi password</Label>
        <Input
          id="resetConfirmPassword"
          type="password"
          placeholder="Ulangi password sementara"
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
        {isPending ? "Mereset..." : "Reset password user"}
      </Button>
    </form>
  );
}
