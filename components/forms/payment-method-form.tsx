"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { SelectOption } from "@/lib/options";

type PaymentMethodFormProps = {
  brands: SelectOption[];
  id?: string;
  defaultValues?: {
    code?: string;
    name?: string;
    type?: string;
    accountName?: string;
    accountNo?: string;
    notes?: string;
    isCash?: boolean;
    brandIds?: string[];
  };
  lockedBrandIds?: string[];
};

export function PaymentMethodForm({
  brands,
  id,
  defaultValues,
  lockedBrandIds = [],
}: PaymentMethodFormProps) {
  const router = useRouter();
  const isEditMode = Boolean(id);
  const initialBrandIds = [...new Set([...(defaultValues?.brandIds ?? []), ...lockedBrandIds])];
  const lockedBrandIdSet = new Set(lockedBrandIds);

  const [code, setCode] = useState(defaultValues?.code ?? "");
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [type, setType] = useState(defaultValues?.type ?? "");
  const [accountName, setAccountName] = useState(defaultValues?.accountName ?? "");
  const [accountNo, setAccountNo] = useState(defaultValues?.accountNo ?? "");
  const [notes, setNotes] = useState(defaultValues?.notes ?? "");
  const [isCash, setIsCash] = useState(defaultValues?.isCash ?? false);
  const [brandIds, setBrandIds] = useState<string[]>(initialBrandIds);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggleBrand(brandId: string) {
    if (lockedBrandIdSet.has(brandId)) {
      return;
    }

    setBrandIds((current) =>
      current.includes(brandId)
        ? current.filter((item) => item !== brandId)
        : [...current, brandId],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(
        id ? `/api/master/payment-methods/${id}` : "/api/master/payment-methods",
        {
          method: isEditMode ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code,
            name,
            type,
            accountName,
            accountNo,
            isCash,
            notes,
            brandIds,
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || "Gagal menyimpan metode pembayaran");
      }

      router.push("/master/payment-methods");
      router.refresh();
    } catch (error: any) {
      alert(error.message || "Metode pembayaran gagal disimpan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-white/80 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Kode</Label>
          <Input value={code} onChange={(e) => setCode(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Nama</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Tipe</Label>
          <Input value={type} onChange={(e) => setType(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Nama akun</Label>
          <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Nomor akun</Label>
          <Input value={accountNo} onChange={(e) => setAccountNo(e.target.value)} />
        </div>
        <label className="flex items-center gap-3 rounded-2xl border border-border/70 bg-white/80 px-4 py-3 text-sm text-foreground">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border"
            checked={isCash}
            onChange={(e) => setIsCash(e.target.checked)}
          />
          <span>Metode cash</span>
        </label>
      </div>

      <div className="space-y-3">
        <Label>Brand yang memakai metode pembayaran ini</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {brands.map((brand) => {
            const checked = brandIds.includes(brand.value);
            const isLocked = lockedBrandIdSet.has(brand.value);

            return (
              <label
                key={brand.value}
                className={`flex items-center gap-3 rounded-2xl border border-border/70 bg-white/80 px-4 py-3 text-sm text-foreground ${isLocked ? "opacity-80" : ""}`}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border"
                  checked={checked}
                  disabled={isLocked}
                  onChange={() => toggleBrand(brand.value)}
                />
                <span>{brand.label}</span>
                {isLocked ? (
                  <span className="ml-auto text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Terkunci
                  </span>
                ) : null}
              </label>
            );
          })}
        </div>
        <p className="text-sm text-muted-foreground">
          Pilih minimal satu brand agar metode pembayaran muncul di dropdown transaksi.
        </p>
        {lockedBrandIds.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            Brand yang sudah dipakai histori transaksi tidak bisa dilepas.
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label>Catatan</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Menyimpan..." : isEditMode ? "Simpan perubahan" : "Simpan metode pembayaran"}
      </Button>
    </form>
  );
}
