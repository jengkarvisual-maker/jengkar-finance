"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { upsertProjectAction } from "@/lib/actions/finance";
import { projectSchema, type ProjectSchema } from "@/lib/validations/finance";
import { ErrorSummary } from "@/components/forms/error-summary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Option = {
  value: string;
  label: string;
};

type ProjectFormProps = {
  id?: string;
  defaultValues?: Partial<ProjectSchema>;
  brands: Option[];
  clients: Option[];
  statuses: Option[];
};

export function ProjectForm({
  id,
  defaultValues,
  brands,
  clients,
  statuses,
}: ProjectFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<ProjectSchema>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      projectCode: defaultValues?.projectCode ?? "",
      name: defaultValues?.name ?? "",
      brandId: defaultValues?.brandId ?? "",
      clientId: defaultValues?.clientId ?? "",
      projectDate: defaultValues?.projectDate ?? new Date().toISOString().slice(0, 10),
      value: defaultValues?.value ?? 0,
      status: defaultValues?.status ?? "LEAD",
      notes: defaultValues?.notes ?? "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setMessage(null);
    startTransition(async () => {
      const result = await upsertProjectAction(values, id);
      setMessage(result.message);
      if (result.ok) {
        router.push("/projects");
        router.refresh();
      }
    });
  });

  return (
    <Card className="border-border/70 bg-white/80">
      <CardHeader>
        <CardTitle>{id ? "Edit project" : "Buat project baru"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={onSubmit}>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="projectCode">Kode project</Label>
              <Input id="projectCode" placeholder="Otomatis jika kosong" {...form.register("projectCode")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectDate">Tanggal project</Label>
              <Input id="projectDate" type="date" {...form.register("projectDate")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status project</Label>
              <Select id="status" options={statuses} {...form.register("status")} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="name">Nama project</Label>
              <Input id="name" placeholder="Contoh: Wedding Andra & Nisa" {...form.register("name")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">Nilai project</Label>
              <Input id="value" type="number" min="0" step="1000" {...form.register("value", { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brandId">Brand</Label>
              <Select id="brandId" options={brands} placeholder="Pilih brand" {...form.register("brandId")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientId">Klien</Label>
              <Select id="clientId" options={clients} placeholder="Pilih klien" {...form.register("clientId")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Catatan</Label>
            <Textarea id="notes" placeholder="Opsional" {...form.register("notes")} />
          </div>

          <ErrorSummary
            errors={form.formState.errors as Record<string, { message?: string } | undefined>}
          />
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Menyimpan..." : "Simpan project"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => router.push("/projects")}>
              Batal
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
