"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { ErrorSummary } from "@/components/forms/error-summary";
import { DeleteButton } from "@/components/shared/delete-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createInvoiceAdditionalItemAction,
  deleteInvoiceAdditionalItemAction,
} from "@/lib/actions/finance";
import {
  invoiceAdditionalItemSchema,
  type InvoiceAdditionalItemSchema,
} from "@/lib/validations/finance";
import { formatCurrency, formatDateTime } from "@/lib/utils";

type AdditionalItemRow = {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  notes: string | null;
  createdAt: string;
};

type InvoiceAdditionalItemsPanelProps = {
  invoiceId: string;
  baseTotal: number;
  additionalTotal: number;
  grandTotal: number;
  downPayment: number;
  amountPaid: number;
  outstandingDisplay: number;
  items: AdditionalItemRow[];
};

export function InvoiceAdditionalItemsPanel({
  invoiceId,
  baseTotal,
  additionalTotal,
  grandTotal,
  downPayment,
  amountPaid,
  outstandingDisplay,
  items,
}: InvoiceAdditionalItemsPanelProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isFormOpen, setIsFormOpen] = useState(items.length === 0);

  const form = useForm<InvoiceAdditionalItemSchema>({
    resolver: zodResolver(invoiceAdditionalItemSchema),
    defaultValues: {
      invoiceId,
      name: "",
      description: "",
      quantity: 1,
      unitPrice: 0,
      notes: "",
    },
  });

  const quantity = useWatch({ control: form.control, name: "quantity" }) ?? 0;
  const unitPrice = useWatch({ control: form.control, name: "unitPrice" }) ?? 0;
  const liveTotal = useMemo(
    () => Math.max(Number(quantity || 0), 0) * Math.max(Number(unitPrice || 0), 0),
    [quantity, unitPrice],
  );

  const onSubmit = form.handleSubmit((values) => {
    setMessage(null);

    startTransition(async () => {
      const result = await createInvoiceAdditionalItemAction({
        ...values,
        invoiceId,
      });

      setMessage(result.message);

      if (result.ok) {
        form.reset({
          invoiceId,
          name: "",
          description: "",
          quantity: 1,
          unitPrice: 0,
          notes: "",
        });
        setIsFormOpen(false);
        router.refresh();
      }
    });
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
      <Card className="border-border/70 bg-white/80">
        <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
          <div className="space-y-2">
            <div className="metric-chip">Penambahan item & biaya</div>
            <CardTitle>Rincian biaya tambahan invoice</CardTitle>
            <p className="text-sm text-muted-foreground">
              Tambahkan biaya susulan tanpa mengubah nilai invoice awal di database.
            </p>
          </div>
          <Button
            type="button"
            variant={isFormOpen ? "secondary" : "default"}
            onClick={() => setIsFormOpen((current) => !current)}
            className="w-full sm:w-auto"
          >
            {isFormOpen ? "Tutup form" : "+ Tambah Item / Biaya"}
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {isFormOpen ? (
            <form className="space-y-5 rounded-3xl border border-border/70 bg-muted/20 p-5" onSubmit={onSubmit}>
              <input type="hidden" {...form.register("invoiceId")} value={invoiceId} />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="additional-name">Nama item tambahan</Label>
                  <Input
                    id="additional-name"
                    placeholder="Contoh: tambahan transport"
                    {...form.register("name")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="additional-quantity">Quantity</Label>
                  <Input
                    id="additional-quantity"
                    type="number"
                    min="1"
                    step="0.01"
                    {...form.register("quantity", { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="additional-unit-price">Harga satuan</Label>
                  <Input
                    id="additional-unit-price"
                    type="number"
                    min="0"
                    step="1"
                    {...form.register("unitPrice", { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="additional-description">Deskripsi</Label>
                  <Textarea
                    id="additional-description"
                    className="min-h-[96px]"
                    placeholder="Opsional"
                    {...form.register("description")}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="additional-notes">Catatan</Label>
                  <Textarea
                    id="additional-notes"
                    className="min-h-[96px]"
                    placeholder="Opsional"
                    {...form.register("notes")}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-white px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Total otomatis</span>
                  <span className="text-base font-semibold text-foreground">
                    {formatCurrency(liveTotal)}
                  </span>
                </div>
              </div>

              <ErrorSummary
                errors={form.formState.errors as Record<string, { message?: string } | undefined>}
              />
              {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Menyimpan..." : "Simpan item tambahan"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setIsFormOpen(false);
                    setMessage(null);
                  }}
                >
                  Batal
                </Button>
              </div>
            </form>
          ) : null}

          <div className="space-y-4">
            {items.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border/80 bg-muted/10 px-5 py-8 text-center">
                <p className="text-base font-medium text-foreground">
                  Belum ada item atau biaya tambahan
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Invoice lama tetap aman. Jika ada biaya tambahan, tambahkan dari tombol di atas.
                </p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-3xl border border-border/70 bg-white px-5 py-4"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div>
                        <p className="text-base font-semibold text-foreground">{item.name}</p>
                        {item.description ? (
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        ) : null}
                      </div>
                      <div className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                        <p>Qty: {item.quantity}</p>
                        <p>Harga satuan: {formatCurrency(item.unitPrice)}</p>
                        <p>Total: {formatCurrency(item.totalAmount)}</p>
                        <p>Dibuat: {formatDateTime(item.createdAt)}</p>
                      </div>
                      {item.notes ? (
                        <p className="text-sm text-muted-foreground">Catatan: {item.notes}</p>
                      ) : null}
                    </div>

                    <DeleteButton
                      action={deleteInvoiceAdditionalItemAction}
                      id={item.id}
                      label="Hapus item"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-white/80">
        <CardHeader>
          <div className="metric-chip">Ringkasan tampilan</div>
          <CardTitle>Total invoice dengan item tambahan</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4 text-sm">
          <div className="space-y-3 rounded-3xl border border-border/70 bg-muted/20 p-5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Total invoice awal</span>
              <span className="font-medium text-foreground">{formatCurrency(baseTotal)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Total tambahan</span>
              <span className="font-medium text-foreground">
                {formatCurrency(additionalTotal)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-border/70 pt-3">
              <span className="font-semibold text-foreground">Grand total</span>
              <span className="text-base font-semibold text-foreground">
                {formatCurrency(grandTotal)}
              </span>
            </div>
          </div>

          <div className="space-y-3 rounded-3xl border border-border/70 bg-white p-5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">DP diterima</span>
              <span className="font-medium text-foreground">
                {formatCurrency(downPayment)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Sudah dibayar</span>
              <span className="font-medium text-foreground">{formatCurrency(amountPaid)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-border/70 pt-3">
              <span className="font-semibold text-foreground">Sisa pembayaran tampilan</span>
              <span className="text-base font-semibold text-foreground">
                {formatCurrency(outstandingDisplay)}
              </span>
            </div>
          </div>

          <p className="text-xs leading-6 text-muted-foreground">
            Nilai tambahan ini dihitung secara dinamis untuk tampilan dan PDF. Total invoice
            dasar di database tidak diubah otomatis pada tahap ini.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
