import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="page-shell flex items-center justify-center p-6">
      <Card className="w-full max-w-lg border-border/70 bg-card/90">
        <CardHeader>
          <p className="metric-chip">404</p>
          <CardTitle>Halaman tidak ditemukan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Link yang kamu buka tidak tersedia atau sudah dipindahkan dari
            modul operasional finance.
          </p>
          <Button asChild>
            <Link href="/dashboard">Kembali ke dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
