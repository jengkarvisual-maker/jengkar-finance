"use client";

import { useActionState, useState } from "react";

import {
  activityLogMaintenanceAction,
  type MaintenanceActionState,
} from "@/lib/actions/data-maintenance";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const initialMaintenanceState: MaintenanceActionState = {
  error: null,
  success: null,
  preview: null,
};

type MaintenanceCardProps = {
  action: (
    state: MaintenanceActionState,
    formData: FormData,
  ) => Promise<MaintenanceActionState>;
  description: string;
  exportDataset: string;
  helper: string;
  title: string;
};

function MaintenanceCard({
  action,
  description,
  exportDataset,
  helper,
  title,
}: MaintenanceCardProps) {
  const [state, formAction, isPending] = useActionState(action, initialMaintenanceState);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const canExport = Boolean(fromDate && toDate) && !isPending;

  function handleExport() {
    if (!canExport) {
      return;
    }

    const params = new URLSearchParams({
      dataset: exportDataset,
      from: fromDate,
      to: toDate,
    });

    window.open(`/api/maintenance/export?${params.toString()}`, "_blank", "noopener,noreferrer");
  }

  return (
    <Card className="border-border/70 bg-white/80">
      <CardHeader>
        <div className="metric-chip">Data Maintenance</div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor={`${title}-from`}>
                Tanggal mulai
              </label>
              <Input
                disabled={isPending}
                id={`${title}-from`}
                name="fromDate"
                onChange={(event) => setFromDate(event.target.value)}
                type="date"
                value={fromDate}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor={`${title}-to`}>
                Tanggal akhir
              </label>
              <Input
                disabled={isPending}
                id={`${title}-to`}
                name="toDate"
                onChange={(event) => setToDate(event.target.value)}
                type="date"
                value={toDate}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-white/70 px-4 py-3 text-sm leading-6 text-muted-foreground">
            {helper}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor={`${title}-confirm`}>
              Konfirmasi hapus
            </label>
            <Input
              disabled={isPending}
              id={`${title}-confirm`}
              name="confirmationText"
              placeholder='Ketik "HAPUS" saat benar-benar ingin menghapus'
              type="text"
            />
          </div>

          {state.preview ? (
            <div className="rounded-2xl border border-primary/15 bg-primary/10 px-4 py-3 text-sm text-foreground">
              {state.preview.summary}
            </div>
          ) : null}

          {state.error ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {state.error}
            </div>
          ) : null}

          {state.success ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {state.success}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button disabled={isPending} name="intent" type="submit" value="preview" variant="secondary">
              {isPending ? "Memproses..." : "Preview periode"}
            </Button>
            <Button disabled={!canExport} onClick={handleExport} type="button" variant="outline">
              Export CSV
            </Button>
            <Button
              disabled={isPending}
              name="intent"
              type="submit"
              value="delete"
              variant="destructive"
            >
              {isPending ? "Menghapus..." : "Hapus periode"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function DataMaintenanceForms() {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <MaintenanceCard
        action={activityLogMaintenanceAction}
        description="Bersihkan jejak aktivitas lama yang tumbuh setiap hari dari penggunaan internal."
        exportDataset="activity-log"
        helper="Ini adalah satu-satunya pembersihan periodik yang aktif. Operasi ini tidak menyentuh transaksi, invoice, tagihan vendor, project, aset, client, vendor, brand, atau master data finance yang sudah diinput."
        title="Activity log"
      />
      <Card className="border-border/70 bg-white/80">
        <CardHeader>
          <div className="metric-chip">Data Maintenance</div>
          <CardTitle>Data finance terlindungi</CardTitle>
          <CardDescription>
            Pembersihan periodik sengaja dibatasi agar tidak menghapus data keuangan yang pernah diinput.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-7 text-emerald-800">
            Transaksi, invoice, tagihan vendor, project, aset, brand, client, vendor, akun, metode pembayaran, dan kategori transaksi tidak ikut dibersihkan dari menu ini.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
