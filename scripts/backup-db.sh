#!/usr/bin/env bash
set -euo pipefail

DB_URL="${DIRECT_URL:-${DATABASE_URL:-}}"

if [[ -z "${DB_URL}" ]]; then
  echo "DIRECT_URL or DATABASE_URL must be exported before running backup-db.sh" >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-$(pwd)/backups}"
APP_NAME="${APP_NAME:-rumah-jengkar-finance}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
OUTPUT_FILE="${BACKUP_DIR}/${APP_NAME}_db_${TIMESTAMP}.dump"

SANITIZED_DB_URL="$(python3 - "${DB_URL}" <<'PY'
import sys
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

raw = sys.argv[1]
parts = urlsplit(raw)
filtered = [
    (key, value)
    for key, value in parse_qsl(parts.query, keep_blank_values=True)
    if key not in {"schema", "pgbouncer", "connection_limit"}
]
print(
    urlunsplit(
        (parts.scheme, parts.netloc, parts.path, urlencode(filtered), parts.fragment)
    )
)
PY
)"

mkdir -p "${BACKUP_DIR}"

pg_dump \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="${OUTPUT_FILE}" \
  "${SANITIZED_DB_URL}"

echo "Database backup created at ${OUTPUT_FILE}"
