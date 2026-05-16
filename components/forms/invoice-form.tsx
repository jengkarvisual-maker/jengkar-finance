"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState, useTransition } from "react";
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
  brandId?: string;
  brandIds?: string[];
};

type InvoiceFormProps = {
  id?: string;
  defaultValues?: Partial<InvoiceSchema>;
  brands: Option[];
  clients: Option[];
  projects: Option[];
  isLinkedToTransactions?: boolean;
  children?: ReactNode;
};

export function InvoiceForm({
  id,
  defaultValues,
  brands,
  clients,
  projects,
  isLinkedToTransactions = false,
  children,
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
  const selectedBrandId = form.watch("brandId");
  const selectedClientId = form.watch("clientId");
  const selectedProjectId = form.watch("projectId");
  const filteredClients = selectedBrandId
    ? clients.filter((client) => client.brandIds?.includes(selectedBrandId))
    : clients;
  const filteredProjects = selectedBrandId
    ? projects.filter((project) => project.brandId === selectedBrandId)
    : projects;

  useEffect(() => {
    if (!selectedBrandId) {
      return;
    }

    const selectedClient = clients.find((client) => client.value === selectedClientId);
    if (selectedClientId && (!selectedClient || !selectedClient.brandIds?.includes(selectedBrandId))) {
      form.setValue("clientId", "", { shouldDirty: true, shouldValidate: true });
    }

    const selectedProject = projects.find((project) => project.value === selectedProjectId);
    if (selectedProjectId && (!selectedProject || selectedProject.brandId !== selectedBrandId)) {
      form.setValue("projectId", "", { shouldDirty: true, shouldValidate: true });
    }
  }, [clients, form, projects, selectedBrandId, selectedClientId, selectedProjectId]);

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
              <Select
                id="clientId"
                options={filteredClients}
                placeholder={selectedBrandId ? "Pilih klien" : "Pilih brand terlebih dahulu"}
                disabled={!selectedBrandId}
                {...form.register("clientId")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectId">Project</Label>
              <Select
                id="projectId"
                options={filteredProjects}
                placeholder={selectedBrandId ? "Opsional" : "Pilih brand terlebih dahulu"}
                disabled={!selectedBrandId}
                {...form.register("projectId")}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            DP diterima dan total pembayaran invoice sekarang selalu mengikuti transaksi kas yang ditautkan,
            terutama transaksi bertipe <span className="font-medium text-foreground">CLIENT_DP</span> dan
            <span className="font-medium text-foreground"> CLIENT_SETTLEMENT</span>.
            {isLinkedToTransactions ? (
              <span className="block pt-2">
                Karena invoice ini sudah punya histori transaksi, perubahan brand, klien, atau project akan ditolak
                oleh sistem.
              </span>
            ) : null}
          </div>

          <div className="grid gap-4 lg:grid-cols-1">
            <div className="space-y-2">
              <Label htmlFor="totalAmount">Nilai invoice</Label>
              <Input id="totalAmount" type="number" min="0" step="1" {...form.register("totalAmount", { valueAsNumber: true })} />
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

        {children}
      </CardContent>
    </Card>
  );
}
