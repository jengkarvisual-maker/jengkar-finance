# RUMAH JENGKAR FINANCE

Internal finance web app untuk grup bisnis kreatif multi-brand Rumah Jengkar.

## Highlights

- Next.js App Router + TypeScript + Tailwind CSS
- Prisma ORM + PostgreSQL
- Role-based auth sederhana berbasis email + password
- Dashboard konsolidasi dan dashboard per brand
- Modul transaksi, piutang, hutang vendor, aset, project/event
- Laporan laba rugi, arus kas, rekap transaksi, rekap piutang, rekap hutang, ringkasan aset
- Export CSV untuk transaksi, laba rugi, piutang, dan hutang
- Activity log untuk login, create, update, delete

## Arsitektur

### Frontend

- `app/` memakai Next.js App Router
- `components/ui/` berisi primitive style `shadcn/ui` yang dipakai ulang di seluruh modul
- `components/forms/` berisi form RHF + Zod untuk modul inti
- `components/dashboard/` berisi metric cards dan chart wrappers berbasis Recharts

### Backend

- Server Actions untuk create/update/delete data
- Prisma service layer untuk query, agregasi dashboard, dan laporan
- Session auth berbasis cookie JWT signed (`jose`) + verifikasi user di database
- Route handlers untuk export CSV

### Data Layer

- `prisma/schema.prisma` mendesain model inti:
  - `User`, `Role`, `UserBrandAccess`
  - `Brand`
  - `Account`, `TransactionCategory`, `PaymentMethod`
  - `Client`, `Vendor`
  - `Project`
  - `Transaction`
  - `Invoice`
  - `VendorBill`
  - `Asset`, `AssetDepreciation`
  - `Attachment`
  - `ActivityLog`

## Struktur Folder

```text
app/
  (auth)/login
  (app)/
    dashboard/
    master/
    transactions/
    receivables/
    payables/
    assets/
    projects/
    reports/
  api/export/
components/
  dashboard/
  forms/
  layout/
  shared/
  ui/
lib/
  actions/
  auth/
  services/
  validations/
prisma/
  schema.prisma
  seed.ts
types/
```

## Role & Permission

- `Owner`
  - akses semua brand
  - lihat semua laporan
  - kelola semua data
- `Admin`
  - kelola transaksi dan master data
  - akses brand sesuai assignment atau semua brand
- `Finance Staff`
  - input transaksi
  - kelola piutang/hutang/aset/project untuk brand yang diizinkan
  - lihat laporan terbatas melalui scope brand

## Seed Accounts

Setelah menjalankan seed, login default:

- `owner@rumahjengkar.id` / `Jengkar123!`
- `admin@rumahjengkar.id` / `Jengkar123!`
- `finance@rumahjengkar.id` / `Jengkar123!`

Untuk production, jangan biarkan password default ini tetap aktif. Ganti password semua akun seed atau buat akun baru khusus tim internal.

## Setup Local

1. Install Node.js 20+ atau 22+.
2. Siapkan PostgreSQL lokal.
3. Salin `.env.example` menjadi `.env`.
4. Install dependency:

```bash
npm install
```

5. Generate Prisma client:

```bash
npm run db:generate
```

6. Buat migration database:

```bash
npm run db:migrate
```

7. Isi dummy data:

```bash
npm run db:seed
```

8. Jalankan aplikasi:

```bash
npm run dev
```

9. Buka [http://localhost:3000](http://localhost:3000)

## Environment Variables

Lihat `.env.example`:

- `DATABASE_URL`
- `DIRECT_URL`
- `SESSION_SECRET`
- `APP_URL`
- `DEFAULT_TIMEZONE`

Untuk production:

- set `APP_URL` ke domain publik final, misalnya `https://jengkar-finance-nine.vercel.app` atau custom domain Anda
- gunakan `SESSION_SECRET` acak yang panjang
- pastikan `DATABASE_URL` dan `DIRECT_URL` mengarah ke database production

## Go Live

Pilihan termudah agar aplikasi bisa diakses dari mana saja adalah deploy ke Vercel:

1. push branch `main` ke GitHub repository yang terhubung ke Vercel
2. isi environment variables production di Vercel:
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `SESSION_SECRET`
   - `APP_URL`
   - `DEFAULT_TIMEZONE`
3. deploy project dan akses domain Vercel atau custom domain
4. login memakai akun internal, lalu ubah password default seed

Catatan production:

- halaman login tidak lagi mengisi otomatis kredensial seed
- metadata dan response headers sekarang diberi `noindex` agar aplikasi internal tidak diindeks mesin pencari
- tersedia halaman `Print / Save PDF` untuk invoice agar operasional tidak bergantung penuh pada PDF server-side

## Business Rules Yang Sudah Diimplementasikan

- nominal transaksi tidak boleh bentrok: hanya salah satu `amountIn` atau `amountOut`
- transaksi pengeluaran wajib mengisi nominal keluar
- transaksi pemasukan wajib mengisi nominal masuk
- brand wajib dipilih
- akun wajib selaras dengan kategori akun pada kategori transaksi
- invoice menghitung `amountPaid`, `downPayment`, `outstandingAmount`, dan `status` otomatis
- vendor bill menghitung `amountPaid`, `outstandingAmount`, dan `status` otomatis
- project menghitung pendapatan, biaya, dan profit berdasarkan transaksi terkait
- aset otomatis membentuk jadwal penyusutan garis lurus per bulan
- semua create/update/delete penting masuk ke `ActivityLog`

## Export CSV

Endpoint yang tersedia:

- `/api/export/transactions`
- `/api/export/profit-loss`
- `/api/export/receivables`
- `/api/export/payables`

## Catatan Implementasi

- Lampiran `Attachment` sudah disiapkan pada schema, tetapi upload file fisik belum saya surface ke UI agar local-first setup tetap sederhana.
- Jika memakai Supabase transaction pooler `:6543`, pastikan `DATABASE_URL` memakai `?pgbouncer=true` dan `DIRECT_URL` diarahkan ke koneksi direct `:5432`.
- Environment kerja saat penyusunan ini belum memiliki `node` dan `npm`, jadi install dependency, migration SQL generated file, dan runtime verification belum bisa dieksekusi dari session ini.
- Setelah Node tersedia, langkah terpenting berikutnya adalah menjalankan `npm install`, `npm run db:migrate`, `npm run db:seed`, lalu `npm run dev`.
