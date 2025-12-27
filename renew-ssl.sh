#!/bin/bash

# Скрипт для автоматического обновления SSL сертификатов Let's Encrypt
# Добавьте в crontab для запуска дважды в день:
# 0 0,12 * * * /path/to/renew-ssl.sh >> /var/log/ssl-renew.log 2>&1

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/ssl-renew.log"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting SSL certificate renewal check..." | tee -a "$LOG_FILE"

# Проверяем и обновляем сертификаты
docker run --rm \
    -v "$SCRIPT_DIR/certbot:/var/www/certbot:rw" \
    -v /etc/letsencrypt:/etc/letsencrypt \
    certbot/certbot renew \
    --webroot \
    --webroot-path=/var/www/certbot \
    --quiet

RENEW_EXIT=$?

if [ $RENEW_EXIT -eq 0 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Certificate check/renewal completed successfully" | tee -a "$LOG_FILE"
    
    # Перезагружаем nginx если сертификаты были обновлены
    docker exec price-service-client nginx -s reload || echo "Failed to reload nginx" | tee -a "$LOG_FILE"
    
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Nginx reloaded" | tee -a "$LOG_FILE"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Certificate renewal failed with exit code $RENEW_EXIT" | tee -a "$LOG_FILE"
    exit 1
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] SSL renewal process completed" | tee -a "$LOG_FILE"
