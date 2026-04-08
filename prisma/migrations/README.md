# Prisma Migrations

Schema utama sudah tersedia di `prisma/schema.prisma`.

Karena environment penyusunan ini belum memiliki `node`, `npm`, dan Prisma CLI yang bisa dieksekusi, file SQL migration hasil generate belum bisa dibuat otomatis dari session ini.

Setelah Node.js tersedia, generate migration awal dengan:

```bash
npm install
npm run db:migrate
```

Perintah tersebut akan membuat folder migration SQL aktual berdasarkan schema yang sudah disiapkan.
