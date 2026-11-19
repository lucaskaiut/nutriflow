#!/usr/bin/env bash
# NutriFlow — backup do banco (dump lógico consistente, comprimido e com retenção).
#
# Uso (no host, a partir da raiz do projeto):
#   ./docker/backup/backup.sh                 # gera backups/nutriflow-AAAAMMDD-HHMMSS.sql.gz
#   BACKUP_DIR=/mnt/seguro RETENTION_DAYS=14 ./docker/backup/backup.sh
#
# Agende diariamente (ex.: cron `15 3 * * * cd /srv/nutriflow && ./docker/backup/backup.sh`).
# Em produção, mantenha BACKUP_DIR em volume criptografado e envie uma cópia para armazenamento
# externo (ex.: bucket com criptografia e acesso restrito). Ver docs/arquitetura.md → "Backup".
set -Eeuo pipefail

PROJECT="${COMPOSE_PROJECT:-nutriflow}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
DB="${DB_DATABASE:-nutriflow}"
STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="${BACKUP_DIR}/nutriflow-${STAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
umask 077

# --single-transaction: snapshot consistente sem travar as tabelas (InnoDB)
docker compose -p "$PROJECT" exec -T mysql sh -c \
  "exec mysqldump -uroot -p\"\$MYSQL_ROOT_PASSWORD\" --single-transaction --routines --triggers --no-tablespaces \"$DB\"" \
  | gzip -9 > "$FILE"

# valida o arquivo gerado
gzip -t "$FILE"
echo "[backup] $(du -h "$FILE" | cut -f1) → $FILE"

# retenção: contas excluídas deixam de existir nos backups após este prazo
find "$BACKUP_DIR" -name 'nutriflow-*.sql.gz' -type f -mtime +"$RETENTION_DAYS" -print -delete | sed 's/^/[backup] removido (retenção): /'
