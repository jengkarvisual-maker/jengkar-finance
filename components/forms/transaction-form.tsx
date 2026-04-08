"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { upsertTransactionAction } from "@/lib/actions/finance";
import { transactionSchema, type TransactionSchema } from "@/lib/validations/finance";
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

type TransactionFormProps = {
  id?: string;
  defaultValues?: Partial<TransactionSchema>;
  brands: Option[];
  transactionTypes: Option[];
  paymentStatuses: Option[];
  categories: Option[];
  accounts: Option[];
  clients: Option[];
  vendors: Option[];
  projects: Option[];
  paymentMethods: Option[];
  invoices: Option[];
  vendorBills: Option[];
};

export function TransactionForm({
  id,
  defaultValues,
  brands,
  transactionTypes,
  paymentStatuses,
  categories,
  accounts,
  clients,
  vendors,
  projects,
  paymentMethods,
  invoices,
  vendorBills,
}: TransactionFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<TransactionSchema>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      transactionDate: defaultValues?.transactionDate ?? new Date().toISOString().slice(0, 10),
      brandId: defaultValues?.brandId ?? "",
      transactionType: defaultValues?.transactionType ?? "INCOME",
      categoryId: defaultValues?.categoryId ?? "",
      accountId: defaultValues?.accountId ?? "",
      description: defaultValues?.description ?? "",
      clientId: defaultValues?.clientId ?? "",
      vendorId: defaultValues?.vendorId ?? "",
      projectId: defaultValues?.projectId ?? "",
      paymentMethodId: defaultValues?.paymentMethodId ?? "",
      paymentStatus: defaultValues?.paymentStatus ?? "PAID",
      amountIn: defaultValues?.amountIn ?? 0,
      amountOut: defaultValues?.amountOut ?? 0,
      referenceNo: defaultValues?.referenceNo ?? "",
      invoiceId: defaultValues?.invoiceId ?? "",
      vendorBillId: defaultValues?.vendorBillId ?? "",
      notes: defaultValues?.notes ?? "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setMessage(null);
    startTransition(async () => {
      const result = await upsertTransactionAction(values, id);
      setMessage(result.message);

      if (result.ok) {
        router.push("/transactions");
        router.refresh();
      }
    });
  });

  return (
    <Card className="border-border/70 bg-white/80">
      <CardHeader>
        <CardTitle>{id ? "Edit transaksi" : "Input transaksi baru"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={onSubmit}>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="transactionDate">Tanggal transaksi</Label>
              <Input id="transactionDate" type="date" {...form.register("transactionDate")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brandId">Brand</Label>
              <Select id="brandId" options={brands} placeholder="Pilih brand" {...form.register("brandId")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transactionType">Jenis transaksi</Label>
              <Select id="transactionType" options={transactionTypes} {...form.register("transactionType")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoryId">Kategori transaksi</Label>
              <Select id="categoryId" options={categories} placeholder="Pilih kategori" {...form.register("categoryId")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountId">Akun</Label>
              <Select id="accountId" options={accounts} placeholder="Pilih akun" {...form.register("accountId")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentStatus">Status pembayaran</Label>
              <Select id="paymentStatus" options={paymentStatuses} {...form.register("paymentStatus")} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Input id="description" placeholder="Contoh: DP Wedding Andra & Nisa" {...form.register("description")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="referenceNo">Referensi invoice / nota</Label>
              <Input id="referenceNo" placeholder="INV-2026..." {...form.register("referenceNo")} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="clientId">Klien</Label>
              <Select id="clientId" options={clients} placeholder="Opsional" {...form.register("clientId")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendorId">Vendor</Label>
              <Select id="vendorId" options={vendors} placeholder="Opsional" {...form.register("vendorId")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectId">Project / Event</Label>
              <Select id="projectId" options={projects} placeholder="Opsional" {...form.register("projectId")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentMethodId">Metode pembayaran</Label>
              <Select id="paymentMethodId" options={paymentMethods} placeholder="Opsional" {...form.register("paymentMethodId")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoiceId">Invoice terkait</Label>
              <Select id="invoiceId" options={invoices} placeholder="Opsional" {...form.register("invoiceId")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendorBillId">Tagihan vendor terkait</Label>
              <Select id="vendorBillId" options={vendorBills} placeholder="Opsional" {...form.register("vendorBillId")} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amountIn">Nominal masuk</Label>
              <Input id="amountIn" type="number" min="0" step="1000" {...form.register("amountIn", { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amountOut">Nominal keluar</Label>
              <Input id="amountOut" type="number" min="0" step="1000" {...form.register("amountOut", { valueAsNumber: true })} />
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
              {isPending ? "Menyimpan..." : "Simpan transaksi"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => router.push("/transactions")}>
              Batal
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
