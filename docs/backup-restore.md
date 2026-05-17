# Backup and Restore

Dokumen ini disiapkan untuk backup aman aplikasi Finance tanpa menyimpan credential sensitif ke repository.

## Persiapan

Export kredensial database di shell VPS sebelum menjalankan script:

```bash
set -a
source /root/finance-secrets.env
set +a
```

Jika `DIRECT_URL` belum diexport dari secrets file, Anda juga bisa export manual:

```bash
export DIRECT_URL="postgresql://..."
```

## Backup database harian

```bash
cd /var/www/finance-app
BACKUP_DIR=/var/backups/finance ./scripts/backup-db.sh
```

Output akan berupa file timestamped:

```text
/var/backups/finance/rumah-jengkar-finance_db_YYYYMMDD_HHMMSS.dump
```

Format backup memakai `pg_dump --format=custom` agar restore lebih fleksibel.

## Backup project mingguan

```bash
cd /var/www/finance-app
BACKUP_DIR=/var/backups/finance ./scripts/backup-project.sh
```

Script ini membuat arsip project tanpa `.git`, `node_modules`, `.next`, dan folder backup lokal.

## Restore database

Gunakan database target yang baru atau disposable terlebih dahulu.

```bash
export TARGET_DATABASE_URL="postgresql://..."
cd /var/www/finance-app
./scripts/restore-db.sh /var/backups/finance/rumah-jengkar-finance_db_YYYYMMDD_HHMMSS.dump
```

## Rekomendasi jadwal

- Daily: backup database
- Weekly: backup project/config
- Before deploy besar atau migration: backup database + project

## Contoh cron

```cron
0 2 * * * cd /var/www/finance-app && set -a && . /root/finance-secrets.env && set +a && BACKUP_DIR=/var/backups/finance ./scripts/backup-db.sh >> /var/log/finance-backup.log 2>&1
0 3 * * 0 cd /var/www/finance-app && BACKUP_DIR=/var/backups/finance ./scripts/backup-project.sh >> /var/log/finance-backup.log 2>&1
```
