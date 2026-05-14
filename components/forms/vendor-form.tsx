"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { SelectOption } from "@/lib/options";

type VendorFormProps = {
  brands: SelectOption[];
  id?: string;
  defaultValues?: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    notes?: string;
    brandIds?: string[];
  };
  lockedBrandIds?: string[];
};

export function VendorForm({
  brands,
  id,
  defaultValues,
  lockedBrandIds = [],
}: VendorFormProps) {
  const router = useRouter();
  const isEditMode = Boolean(id);
  const initialBrandIds = [...new Set([...(defaultValues?.brandIds ?? []), ...lockedBrandIds])];
  const lockedBrandIdSet = new Set(lockedBrandIds);

  const [name, setName] = useState(defaultValues?.name ?? "");
  const [phone, setPhone] = useState(defaultValues?.phone ?? "");
  const [email, setEmail] = useState(defaultValues?.email ?? "");
  const [address, setAddress] = useState(defaultValues?.address ?? "");
  const [notes, setNotes] = useState(defaultValues?.notes ?? "");
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
      const response = await fetch(id ? `/api/master/vendors/${id}` : "/api/master/vendors", {
        method: isEditMode ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          phone,
          email,
          address,
          notes,
          brandIds,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || "Gagal menyimpan vendor");
      }

      router.push("/master/vendors");
      router.refresh();
    } catch (error: any) {
      alert(error.message || "Vendor gagal disimpan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-white/80 p-6">
      <div className="space-y-2">
        <Label>Nama vendor</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div className="space-y-2">
        <Label>Kontak / Phone</Label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label>Email</Label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label>Alamat</Label>
        <Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} />
      </div>

      <div className="space-y-3">
        <Label>Brand yang memakai vendor ini</Label>
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
          Pilih minimal satu brand agar vendor muncul di dropdown transaksi dan hutang.
        </p>
        {lockedBrandIds.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            Brand yang sudah dipakai histori tagihan atau transaksi tidak bisa dilepas.
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label>Catatan</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Menyimpan..." : isEditMode ? "Simpan perubahan" : "Simpan vendor"}
      </Button>
    </form>
  );
}
