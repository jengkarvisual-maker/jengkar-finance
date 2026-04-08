"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ClientForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/master/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          companyName,
          phone,
          email,
          address,
          notes,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || "Gagal menyimpan client");
      }

      router.push("/master/clients");
      router.refresh();
    } catch (error: any) {
      alert(error.message || "Client gagal disimpan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-white/80 p-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">Nama</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border px-3 py-2"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Company</label>
        <input
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          className="w-full rounded-md border px-3 py-2"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Kontak / Phone</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-md border px-3 py-2"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border px-3 py-2"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Alamat</label>
        <textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full rounded-md border px-3 py-2"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Catatan</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-md border px-3 py-2"
          rows={3}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-md bg-green-700 px-4 py-2 text-white disabled:opacity-50"
      >
        {isSubmitting ? "Menyimpan..." : "Simpan client"}
      </button>
    </form>
  );
}