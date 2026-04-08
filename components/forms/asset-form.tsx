"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { upsertAssetAction } from "@/lib/actions/finance";
import { assetSchema, type AssetSchema } from "@/lib/validations/finance";
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

type AssetFormProps = {
  id?: string;
  defaultValues?: Partial<AssetSchema>;
  brands: Option[];
  categories: Option[];
  conditions: Option[];
};

export function AssetForm({
  id,
  defaultValues,
  brands,
  categories,
  conditions,
}: AssetFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<AssetSchema>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      assetCode: defaultValues?.assetCode ?? "",
      name: defaultValues?.name ?? "",
      brandId: defaultValues?.brandId ?? "",
      category: defaultValues?.category ?? "CAMERA",
      purchaseDate: defaultValues?.purchaseDate ?? new Date().toISOString().slice(0, 10),
      purchasePrice: defaultValues?.purchasePrice ?? 0,
      usefulLifeMonths: defaultValues?.usefulLifeMonths ?? 36,
      condition: defaultValues?.condition ?? "GOOD",
      notes: defaultValues?.notes ?? "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setMessage(null);
    startTransition(async () => {
      const result = await upsertAssetAction(values, id);
      setMessage(result.message);
      if (result.ok) {
        router.push("/assets");
        router.refresh();
      }
    });
  });

  return (
    <Card className="border-border/70 bg-white/80">
      <CardHeader>
        <CardTitle>{id ? "Edit aset" : "Tambah aset baru"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={onSubmit}>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="assetCode">Kode aset</Label>
              <Input id="assetCode" placeholder="Otomatis jika kosong" {...form.register("assetCode")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brandId">Brand pengguna</Label>
              <Select id="brandId" options={brands} placeholder="Pilih brand" {...form.register("brandId")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Kategori aset</Label>
              <Select id="category" options={categories} {...form.register("category")} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nama aset</Label>
              <Input id="name" placeholder="Contoh: Sony A7 IV" {...form.register("name")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchaseDate">Tanggal beli</Label>
              <Input id="purchaseDate" type="date" {...form.register("purchaseDate")} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="purchasePrice">Harga beli</Label>
              <Input id="purchasePrice" type="number" min="0" step="1000" {...form.register("purchasePrice", { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="usefulLifeMonths">Umur manfaat (bulan)</Label>
              <Input id="usefulLifeMonths" type="number" min="1" step="1" {...form.register("usefulLifeMonths", { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="condition">Kondisi aset</Label>
              <Select id="condition" options={conditions} {...form.register("condition")} />
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
              {isPending ? "Menyimpan..." : "Simpan aset"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => router.push("/assets")}>
              Batal
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
