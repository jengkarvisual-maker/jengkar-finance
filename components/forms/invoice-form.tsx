"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { upsertInvoiceAction } from "@/lib/actions/finance";
import { invoiceSchema, type InvoiceSchema } from "@/lib/validations/finance";
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

type InvoiceFormProps = {
  id?: string;
  defaultValues?: Partial<InvoiceSchema>;
  brands: Option[];
  clients: Option[];
  projects: Option[];
};

export function InvoiceForm({
  id,
  defaultValues,
  brands,
  clients,
  projects,
}: InvoiceFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<InvoiceSchema>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      invoiceNo: defaultValues?.invoiceNo ?? "",
      invoiceDate: defaultValues?.invoiceDate ?? new Date().toISOString().slice(0, 10),
      brandId: defaultValues?.brandId ?? "",
      clientId: defaultValues?.clientId ?? "",
      projectId: defaultValues?.projectId ?? "",
      totalAmount: defaultValues?.totalAmount ?? 0,
      downPayment: defaultValues?.downPayment ?? 0,
      dueDate: defaultValues?.dueDate ?? new Date().toISOString().slice(0, 10),
      notes: defaultValues?.notes ?? "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setMessage(null);
    startTransition(async () => {
      const result = await upsertInvoiceAction(values, id);
      setMessage(result.message);

      if (result.ok) {
        router.push("/receivables");
        router.refresh();
      }
    });
  });

  return (
    <Card className="border-border/70 bg-white/80">
      <CardHeader>
        <CardTitle>{id ? "Edit invoice" : "Buat invoice baru"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={onSubmit}>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="invoiceNo">Nomor invoice</Label>
              <Input id="invoiceNo" placeholder="Otomatis jika kosong" {...form.register("invoiceNo")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoiceDate">Tanggal invoice</Label>
              <Input id="invoiceDate" type="date" {...form.register("invoiceDate")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Jatuh tempo</Label>
              <Input id="dueDate" type="date" {...form.register("dueDate")} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="brandId">Brand</Label>
              <Select id="brandId" options={brands} placeholder="Pilih brand" {...form.register("brandId")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientId">Klien</Label>
              <Select id="clientId" options={clients} placeholder="Pilih klien" {...form.register("clientId")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectId">Project</Label>
              <Select id="projectId" options={projects} placeholder="Opsional" {...form.register("projectId")} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="totalAmount">Nilai invoice</Label>
              <Input id="totalAmount" type="number" min="0" step="1000" {...form.register("totalAmount", { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="downPayment">DP diterima</Label>
              <Input id="downPayment" type="number" min="0" step="1000" {...form.register("downPayment", { valueAsNumber: true })} />
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
              {isPending ? "Menyimpan..." : "Simpan invoice"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => router.push("/receivables")}>
              Batal
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
