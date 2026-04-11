import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Email tidak valid."),
  password: z.string().min(8, "Password minimal 8 karakter."),
});

const passwordSchema = z
  .string()
  .min(8, "Password minimal 8 karakter.")
  .max(120, "Password terlalu panjang.");

export const changePasswordSchema = z
  .object({
    currentPassword: passwordSchema,
    newPassword: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .superRefine((value, ctx) => {
    if (value.newPassword !== value.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Konfirmasi password baru belum sama.",
      });
    }

    if (value.currentPassword === value.newPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["newPassword"],
        message: "Password baru harus berbeda dari password saat ini.",
      });
    }
  });

export const resetUserPasswordSchema = z
  .object({
    userId: z.string().min(1, "User wajib dipilih."),
    newPassword: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .superRefine((value, ctx) => {
    if (value.newPassword !== value.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Konfirmasi password baru belum sama.",
      });
    }
  });

export type LoginSchema = z.infer<typeof loginSchema>;
export type ChangePasswordSchema = z.infer<typeof changePasswordSchema>;
export type ResetUserPasswordSchema = z.infer<typeof resetUserPasswordSchema>;
