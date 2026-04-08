"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { upsertVendorBillAction } from "@/lib/actions/finance";
import { vendorBillSchema, type VendorBillSchema } from "@/lib/validations/finance";
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

type VendorBillFormProps = {
  id?: string;
  defaultValues?: Partial<VendorBillSchema>;
  brands: Option[];
  vendors: Option[];
  projects: Option[];
};

export function VendorBillForm({
  id,
  defaultValues,
  brands,
  vendors,
  projects,
}: VendorBillFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<VendorBillSchema>({
    resolver: zodResolver(vendorBillSchema),
    defaultValues: {
      billNo: defaultValues?.billNo ?? "",
      billDate: defaultValues?.billDate ?? new Date().toISOString().slice(0, 10),
      vendorId: defaultValues?.vendorId ?? "",
      brandId: defaultValues?.brandId ?? "",
      projectId: defaultValues?.projectId ?? "",
      description: defaultValues?.description ?? "",
      totalAmount: defaultValues?.totalAmount ?? 0,
      dueDate: defaultValues?.dueDate ?? new Date().toISOString().slice(0, 10),
      notes: defaultValues?.notes ?? "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setMessage(null);
    startTransition(async () => {
      const result = await upsertVendorBillAction(values, id);
      setMessage(result.message);
      if (result.ok) {
        router.push("/payables");
        router.refresh();
      }
    });
  });

  return (
    <Card className="border-border/70 bg-white/80">
      <CardHeader>
        <CardTitle>{id ? "Edit hutang vendor" : "Buat tagihan vendor baru"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={onSubmit}>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="billNo">Nomor tagihan</Label>
              <Input id="billNo" placeholder="Otomatis jika kosong" {...form.register("billNo")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="billDate">Tanggal tagihan</Label>
              <Input id="billDate" type="date" {...form.register("billDate")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Jatuh tempo</Label>
              <Input id="dueDate" type="date" {...form.register("dueDate")} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="vendorId">Vendor</Label>
              <Select id="vendorId" options={vendors} placeholder="Pilih vendor" {...form.register("vendorId")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brandId">Brand</Label>
              <Select id="brandId" options={brands} placeholder="Pilih brand" {...form.register("brandId")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectId">Project</Label>
              <Select id="projectId" options={projects} placeholder="Opsional" {...form.register("projectId")} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-2">
              <Label htmlFor="description">Keterangan</Label>
              <Input id="description" placeholder="Contoh: Fee makeup artist partner" {...form.register("description")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalAmount">Total tagihan</Label>
              <Input id="totalAmount" type="number" min="0" step="1000" {...form.register("totalAmount", { valueAsNumber: true })} />
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
              {isPending ? "Menyimpan..." : "Simpan tagihan"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => router.push("/payables")}>
              Batal
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
