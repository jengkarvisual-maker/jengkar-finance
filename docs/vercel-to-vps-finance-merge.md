# Merge Aman Data Finance Vercel -> VPS

Dokumen ini khusus untuk kasus:

- sumber data yang paling update ada di deployment Vercel
- aplikasi production aktif dibuka lewat VPS `finance.rumahjengkar.com`
- target akhir adalah **satu database production** di VPS

## Ringkasan temuan

- Project Vercel `jengkar-finance` masih aktif.
- Alias `jengkar-finance-nine.vercel.app` mengarah ke deployment production Vercel.
- Environment Vercel memakai PostgreSQL Supabase pooler:
  - host: `aws-1-ap-southeast-1.pooler.supabase.com`
  - port: `6543`
  - database: `postgres`
- Template production VPS di repo mengarah ke PostgreSQL lokal:
  - host: `localhost`
  - port: `5432`
  - database: `finance_db`

Artinya perbedaan data terjadi karena staff finance input ke database Supabase/Vercel, sementara owner membaca database VPS.

## Prinsip aman

- jangan overwrite target tanpa backup
- jangan drop table
- jangan reset database
- jangan apply merge jika dry-run masih menemukan konflik
- utamakan `stats -> backup -> dry-run -> apply -> validate`

## Tool yang disiapkan

Script merge ada di:

- `scripts/merge-finance-source.ts`

Script ini mendukung mode:

- `stats`
- `export-json`
- `dry-run`
- `apply`

Tambahan pengaman:

- `apply` wajib memakai token konfirmasi
- report JSON otomatis ditulis ke folder `backups/`
- beberapa tabel tanpa unique key schema diberi pemeriksaan natural key konservatif untuk mendeteksi potensi duplikasi

## Backup yang wajib dibuat

### 1. Backup target VPS

Jalankan di VPS sebelum merge:

```bash
cd /var/www/finance-app
source /root/finance-secrets.env
mkdir -p /var/backups/finance-db
pg_dump \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="/var/backups/finance-db/backup_finance_vps_before_merge_$(date +%Y%m%d_%H%M).dump" \
  "$DIRECT_URL"
```

Jika `DIRECT_URL` tidak ada:

```bash
pg_dump \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="/var/backups/finance-db/backup_finance_vps_before_merge_$(date +%Y%m%d_%H%M).dump" \
  "$DATABASE_URL"
```

### 2. Backup source Vercel

Pilihan terbaik tetap `pg_dump` dengan client PostgreSQL **versi 17** agar sesuai dengan server source.

Jika client `pg_dump` 17 belum tersedia, buat dulu backup aplikasi level JSON:

```bash
SOURCE_DATABASE_URL="postgresql://..." \
npx tsx scripts/merge-finance-source.ts \
  --mode=export-json \
  --output "backups/backup_finance_vercel_source_app_$(date +%Y%m%d_%H%M).json"
```

Catatan:

- export JSON **bukan pengganti penuh** backup SQL/dump
- ini hanya fallback aman agar ada snapshot source sebelum merge

## Audit source dan target

### Stats source vs target

Jalankan di environment yang bisa mengakses keduanya:

```bash
SOURCE_DATABASE_URL="postgresql://SOURCE..." \
TARGET_DATABASE_URL="postgresql://TARGET..." \
npx tsx scripts/merge-finance-source.ts \
  --mode=stats \
  --output "backups/finance-merge-stats.json"
```

Report akan berisi:

- jumlah transaksi
- jumlah invoice
- jumlah client
- jumlah brand
- jumlah user
- jumlah project
- jumlah payment method
- transaksi terbaru
- 5 transaksi terakhir source dan target

## Dry-run merge

Setelah backup source dan target aman:

```bash
SOURCE_DATABASE_URL="postgresql://SOURCE..." \
TARGET_DATABASE_URL="postgresql://TARGET..." \
npx tsx scripts/merge-finance-source.ts \
  --mode=dry-run \
  --output "backups/finance-merge-dry-run.json"
```

Perhatikan bagian:

- `missingSummary`
- `conflictCount`
- `conflicts`

### Arti hasil dry-run

- `missingSummary`
  - jumlah row source yang belum ada di target berdasarkan primary key
- `conflicts`
  - row source tidak ada di target berdasarkan ID, tetapi menemukan kandidat bentrok di target berdasarkan business key / natural key

Kalau `conflictCount > 0`:

- **jangan lanjut apply**
- review konflik satu per satu dulu

## Apply merge

Lanjutkan hanya jika:

- backup target sudah ada
- backup source sudah ada
- dry-run bersih atau konflik sudah dipahami dan disetujui

Command:

```bash
SOURCE_DATABASE_URL="postgresql://SOURCE..." \
TARGET_DATABASE_URL="postgresql://TARGET..." \
npx tsx scripts/merge-finance-source.ts \
  --mode=apply \
  --confirm=MERGE_FINANCE_SOURCE \
  --output "backups/finance-merge-apply.json"
```

Report akhir akan berisi:

- `sourceStats`
- `targetStats`
- `targetStatsAfter`
- `missingSummary`
- `conflictCount`

## Validasi pasca merge

Setelah apply selesai:

1. cek transaksi terakhir source dan target
2. cek jumlah transaksi target
3. cek 5 transaksi terakhir target
4. cek invoice/client/brand yang dipakai transaksi terbaru
5. login sebagai owner
6. login sebagai `finance@rumahjengkar.com`
7. buka halaman transaksi
8. pastikan transaksi 22 Mei 2026 muncul
9. tambah transaksi baru
10. hapus transaksi uji jika perlu
11. cek export PDF/CSV yang bergantung pada transaksi

## Query validasi SQL yang berguna

```sql
SELECT COUNT(*) FROM "Transaction";
SELECT COUNT(*) FROM "Invoice";
SELECT COUNT(*) FROM "Client";
SELECT COUNT(*) FROM "Brand";
```

```sql
SELECT "transactionNo", "transactionDate", "createdAt", "description"
FROM "Transaction"
ORDER BY "transactionDate" DESC, "createdAt" DESC
LIMIT 10;
```

## Setelah data sinkron

Agar kejadian dua sumber data tidak terulang:

1. hentikan input data ke deployment Vercel
2. arahkan semua user ke `https://finance.rumahjengkar.com`
3. jika deployment Vercel masih dipakai sementara:
   - ubah env Vercel agar menunjuk database VPS yang sama
   - atau redirect alias Vercel ke domain utama
4. hapus bookmark lama ke `jengkar-finance-nine.vercel.app`
5. pakai satu source of truth saja untuk production

## Catatan penting

- Script merge ini tidak mengubah schema database.
- Script ini tidak menjalankan migration Prisma.
- Karena semua primary key utama berupa `String @id @default(cuid())`, reset sequence PostgreSQL biasanya tidak dibutuhkan untuk tabel inti.
- Tetap lakukan validasi manual setelah merge, terutama untuk tabel yang memang tidak punya unique key schema seperti `Client`, `Vendor`, dan `PaymentMethod`.
