# Migrasi Aman `finance.rumahjengkar.com` ke VPS Hostinger

Dokumen ini disusun untuk proses migrasi aman dengan pendekatan:

`copy -> test -> switch`

Artinya:
- aplikasi lama di Vercel tetap hidup
- database lama di Supabase tetap hidup
- data lama tidak dihapus
- VPS baru disiapkan dan diuji dulu
- domain baru diarahkan setelah hasil uji sudah aman

## 1. Audit Project Saat Ini

### Stack aplikasi

- Framework: `Next.js` App Router
- Bahasa: `TypeScript`
- ORM: `Prisma`
- Database: `PostgreSQL`
- Auth: session cookie internal berbasis `jose` + database user sendiri
- Bukan `NextAuth`
- Bukan `Supabase Auth`

### Struktur penting

- `app/`
- `components/`
- `lib/`
- `prisma/`
- `public/`
- `scripts/`

### Script yang tersedia di `package.json`

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run db:generate`
- `npm run db:migrate`
- `npm run db:seed`
- `npm run db:studio`

Catatan:
- script production untuk migration deploy belum ada di `package.json`
- untuk production gunakan langsung:
  - `npx prisma migrate deploy`

### Dependency penting

- `next`
- `react`
- `react-dom`
- `@prisma/client`
- `prisma`
- `bcryptjs`
- `jose`
- `zod`
- `recharts`

### File database

- schema ada di `prisma/schema.prisma`
- Prisma config ada di `prisma.config.ts`

### Environment variable yang dibutuhkan

Project saat ini memakai:
- `DATABASE_URL`
- `DIRECT_URL`
- `SESSION_SECRET`
- `APP_URL`
- `DEFAULT_TIMEZONE`

Environment yang tidak wajib untuk stack VPS baru ini:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `STORAGE`

Catatan:
- `VERCEL_URL` dan `VERCEL_PROJECT_PRODUCTION_URL` hanya fallback jika deploy di Vercel, jadi tidak wajib di VPS.

## 2. Checklist Migrasi

### A. Backup & persiapan

- [ ] backup source code project
- [ ] backup database Supabase ke `.sql`
- [ ] optional backup kedua ke `.dump`
- [ ] siapkan folder backup di VPS
- [ ] pastikan VPS Ubuntu sudah siap
- [ ] pastikan `Node.js`, `PM2`, `NGINX` sudah terpasang
- [ ] cek apakah PostgreSQL sudah terpasang

### B. Setup database baru di VPS

- [ ] install PostgreSQL jika belum ada
- [ ] buat database `finance_db`
- [ ] buat user `finance_user`
- [ ] buat password kuat
- [ ] grant privilege seperlunya
- [ ] pastikan PostgreSQL hanya listen lokal

### C. Setup aplikasi di VPS

- [ ] clone project ke folder app VPS
- [ ] copy `.env.production.example` menjadi `.env`
- [ ] isi variabel production
- [ ] install dependency
- [ ] generate Prisma client
- [ ] jalankan migration
- [ ] restore data lama atau mulai fresh
- [ ] build aplikasi
- [ ] jalankan dengan PM2 port `3003`

### D. Web server

- [ ] setup NGINX reverse proxy
- [ ] arahkan `finance.rumahjengkar.com` ke `localhost:3003`
- [ ] setup SSL Certbot
- [ ] cek HTTPS aktif

### E. Testing

- [ ] login
- [ ] dashboard
- [ ] create data
- [ ] edit data
- [ ] delete data
- [ ] export CSV
- [ ] refresh halaman
- [ ] cek PM2 logs
- [ ] cek NGINX logs

### F. Switch & rollback

- [ ] ubah DNS hanya setelah uji lolos
- [ ] Vercel lama tetap hidup
- [ ] Supabase lama tetap hidup
- [ ] simpan backup SQL
- [ ] siapkan rollback ke Vercel jika VPS bermasalah

## 3. Backup Database Supabase Lama

### Opsi terbaik: backup dari laptop atau server yang bisa akses Supabase

Format file yang disarankan:
- `.sql`
- `.dump`

Contoh nama file:
- `finance_supabase_backup_YYYYMMDD_HHMM.sql`
- `finance_supabase_backup_YYYYMMDD_HHMM.dump`

### Contoh command `pg_dump` format SQL

```bash
mkdir -p ~/backup/finance

pg_dump \
  --format=plain \
  --no-owner \
  --no-privileges \
  --file ~/backup/finance/finance_supabase_backup_$(date +%Y%m%d_%H%M).sql \
  "postgresql://USER:PASSWORD@HOST:5432/postgres"
```

### Contoh command `pg_dump` format custom dump

```bash
mkdir -p ~/backup/finance

pg_dump \
  --format=custom \
  --file ~/backup/finance/finance_supabase_backup_$(date +%Y%m%d_%H%M).dump \
  "postgresql://USER:PASSWORD@HOST:5432/postgres"
```

### Jika VPS tidak bisa akses Supabase

Pakai salah satu alternatif berikut:
- backup dari Supabase Dashboard
- backup dari laptop lokal
- export pakai `pg_dump` dari komputer lokal, lalu upload file hasil backup ke VPS

## 4. Setup PostgreSQL di VPS

### Install PostgreSQL jika belum ada

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
```

### Pastikan service aktif

```bash
sudo systemctl enable postgresql
sudo systemctl start postgresql
sudo systemctl status postgresql
```

### Buat database dan user khusus

Masuk ke postgres:

```bash
sudo -u postgres psql
```

Lalu jalankan:

```sql
CREATE USER finance_user WITH ENCRYPTED PASSWORD 'GANTI_DENGAN_PASSWORD_KUAT';
CREATE DATABASE finance_db OWNER finance_user;
GRANT ALL PRIVILEGES ON DATABASE finance_db TO finance_user;
```

Keluar:

```sql
\q
```

### Pastikan PostgreSQL tidak terbuka ke publik

Checklist:
- `listen_addresses = 'localhost'`
- firewall tidak membuka port `5432` ke internet
- aplikasi Next.js di VPS mengakses database lewat `localhost`

Lokasi config biasanya:
- `/etc/postgresql/<versi>/main/postgresql.conf`
- `/etc/postgresql/<versi>/main/pg_hba.conf`

Setting aman yang umum:

`postgresql.conf`

```conf
listen_addresses = 'localhost'
```

`pg_hba.conf`

```conf
local   all             all                                     scram-sha-256
host    all             all             127.0.0.1/32            scram-sha-256
host    all             all             ::1/128                 scram-sha-256
```

Reload:

```bash
sudo systemctl reload postgresql
```

## 5. Import Data Lama ke PostgreSQL VPS

### Jika backup `.sql` tersedia

```bash
psql "postgresql://finance_user:PASSWORD@localhost:5432/finance_db" \
  < ~/backup/finance/finance_supabase_backup_YYYYMMDD_HHMM.sql
```

### Jika backup `.dump` tersedia

```bash
pg_restore \
  --no-owner \
  --no-privileges \
  --dbname "postgresql://finance_user:PASSWORD@localhost:5432/finance_db" \
  ~/backup/finance/finance_supabase_backup_YYYYMMDD_HHMM.dump
```

### Validasi setelah restore

Lihat tabel:

```bash
psql "postgresql://finance_user:PASSWORD@localhost:5432/finance_db" -c "\dt"
```

Cek isi singkat:

```bash
psql "postgresql://finance_user:PASSWORD@localhost:5432/finance_db" -c "SELECT COUNT(*) FROM \"User\";"
psql "postgresql://finance_user:PASSWORD@localhost:5432/finance_db" -c "SELECT COUNT(*) FROM \"Transaction\";"
psql "postgresql://finance_user:PASSWORD@localhost:5432/finance_db" -c "SELECT COUNT(*) FROM \"Invoice\";"
```

### Jika ingin mulai fresh

Karena data lama masih data uji coba, opsi fresh migration juga aman:
- buat database kosong `finance_db`
- jalankan Prisma migration
- tidak restore data lama
- Supabase lama tetap disimpan sebagai referensi

Ini lebih simpel kalau Anda tidak butuh data test lama.

## 6. Setup `.env` Production

Gunakan file:
- `.env`
- atau `.env.production`

Template aman:

```env
DATABASE_URL="postgresql://finance_user:PASSWORD@localhost:5432/finance_db?schema=public"
DIRECT_URL="postgresql://finance_user:PASSWORD@localhost:5432/finance_db?schema=public"
SESSION_SECRET="RAHASIA_PANJANG_MINIMAL_32_KARAKTER"
APP_URL="https://finance.rumahjengkar.com"
DEFAULT_TIMEZONE="Asia/Jakarta"
```

Catatan:
- `DATABASE_URL` dan `DIRECT_URL` bisa sama jika PostgreSQL lokal dan tidak pakai pooler
- `SUPABASE_*` tidak diperlukan untuk stack VPS baru ini

## 7. Prisma Migration

### Langkah yang disarankan untuk production

```bash
npm install
npx prisma generate
npx prisma migrate deploy
```

Catatan penting:
- gunakan `prisma migrate deploy` untuk production
- jangan gunakan `prisma db push` di production kecuali benar-benar darurat

Risiko `db push`:
- perubahan schema tidak terdokumentasi sebagai migration history
- lebih berbahaya untuk environment production

### Cek koneksi database

```bash
npx prisma migrate status
```

### Prisma Studio

Hanya untuk testing manual sementara:

```bash
npx prisma studio --port 5555
```

Jangan dibiarkan terbuka ke publik.

## 8. Build Aplikasi

Setelah env dan database siap:

```bash
npm ci
npm run build
```

Kalau `npm ci` gagal karena lockfile tidak cocok, fallback:

```bash
npm install
npm run build
```

## 9. Jalankan Aplikasi dengan PM2

Gunakan port khusus:
- `3003`

### Command aman

```bash
cd /var/www/finance-app
PORT=3003 NODE_ENV=production pm2 start npm --name finance-app -- start
```

Lalu:

```bash
pm2 save
pm2 list
pm2 logs finance-app
```

Jika `pm2 startup` belum diset:

```bash
pm2 startup
```

Ikuti command yang diminta PM2, lalu jalankan lagi:

```bash
pm2 save
```

## 10. Setup NGINX

Contoh config:

Lokasi:
- `/etc/nginx/sites-available/finance.rumahjengkar.com`

Isi:

```nginx
server {
    listen 80;
    server_name finance.rumahjengkar.com;

    location / {
        proxy_pass http://127.0.0.1:3003;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Aktifkan:

```bash
sudo ln -s /etc/nginx/sites-available/finance.rumahjengkar.com /etc/nginx/sites-enabled/finance.rumahjengkar.com
sudo nginx -t
sudo systemctl reload nginx
```

## 11. Setup SSL

Pastikan DNS sudah mengarah ke VPS dulu, lalu:

```bash
sudo certbot --nginx -d finance.rumahjengkar.com
```

Cek auto-renew:

```bash
sudo certbot renew --dry-run
```

## 12. Testing Manual

Checklist uji setelah app hidup di VPS:

- [ ] halaman login terbuka
- [ ] login berhasil
- [ ] dashboard terbuka
- [ ] create data berhasil
- [ ] edit data berhasil
- [ ] delete data berhasil
- [ ] export CSV berhasil
- [ ] data baru benar-benar masuk ke PostgreSQL VPS
- [ ] refresh halaman aman
- [ ] tidak ada error `500`
- [ ] `pm2 logs finance-app` aman
- [ ] `sudo tail -f /var/log/nginx/error.log` aman

## 13. Rollback Plan

Kalau VPS gagal:
- jangan hapus project Vercel lama
- jangan hapus project Supabase lama
- arahkan DNS kembali ke Vercel
- gunakan backup SQL terakhir
- perbaiki VPS sambil traffic kembali ke stack lama

Saran aman:
- pertahankan Vercel + Supabase lama minimal `2-4 minggu`
- baru matikan setelah VPS stabil

## 14. Ringkasan Operasional yang Nanti Harus Dicatat

Setelah migrasi selesai, isi data final berikut:

- folder app di VPS: `/var/www/finance-app`
- nama database: `finance_db`
- nama user database: `finance_user`
- port app: `3003`
- nama process PM2: `finance-app`
- file NGINX: `/etc/nginx/sites-available/finance.rumahjengkar.com`
- folder backup database: `~/backup/finance`

### Command operasional harian

Restart app:

```bash
pm2 restart finance-app
```

Lihat log app:

```bash
pm2 logs finance-app
```

Lihat log NGINX:

```bash
sudo tail -f /var/log/nginx/error.log
```

Backup database manual:

```bash
mkdir -p ~/backup/finance

pg_dump \
  --format=plain \
  --no-owner \
  --no-privileges \
  --file ~/backup/finance/finance_vps_backup_$(date +%Y%m%d_%H%M).sql \
  "postgresql://finance_user:PASSWORD@localhost:5432/finance_db"
```

Restore darurat:

```bash
psql "postgresql://finance_user:PASSWORD@localhost:5432/finance_db" \
  < ~/backup/finance/finance_vps_backup_YYYYMMDD_HHMM.sql
```

## Batas Aman Sebelum Eksekusi Produksi

Sebelum langkah berisiko, minta konfirmasi dulu:
- overwrite database VPS yang sudah berisi data
- ubah DNS production
- matikan stack lama

Yang aman dikerjakan lebih dulu:
- siapkan VPS
- siapkan PostgreSQL lokal VPS
- clone project
- isi `.env`
- build app
- test dengan subdomain atau IP sementara
