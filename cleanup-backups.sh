#!/bin/bash

# Скрипт для очистки старых бекапов и управления местом на диске
# Использование: ./cleanup-backups.sh [дней]
# По умолчанию удаляет бекапы старше 30 дней

set -e

# Получаем директорию скрипта
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BACKUP_DIR="$SCRIPT_DIR/backups"
DAYS=${1:-30}  # По умолчанию 30 дней

if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${RED}❌ Директория $BACKUP_DIR не найдена${NC}"
    exit 1
fi

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Очистка старых бекапов               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}🔍 Ищу бекапы старше $DAYS дней...${NC}"
echo ""

# Находим и удаляем старые бекапы
DELETED_COUNT=0
FREED_SPACE=0

find "$BACKUP_DIR" -name "db_backup_*.sql.gz" -mtime +$DAYS | while read old_backup; do
    SIZE=$(du -h "$old_backup" | cut -f1)
    SIZE_BYTES=$(du "$old_backup" | cut -f1)
    
    echo -e "${RED}🗑️  Удаляю: $(basename $old_backup) ($SIZE)${NC}"
    rm "$old_backup"
    
    FREED_SPACE=$((FREED_SPACE + SIZE_BYTES))
    DELETED_COUNT=$((DELETED_COUNT + 1))
done

echo ""
echo -e "${YELLOW}📈 Статистика:${NC}"
echo "=========================================="

BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/db_backup_*.sql.gz 2>/dev/null | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

echo -e "Удалено бекапов: ${GREEN}$DELETED_COUNT${NC}"
echo -e "Освобождено места: ${GREEN}$((FREED_SPACE / 1024)) MB${NC}"
echo -e "Осталось бекапов: ${GREEN}$BACKUP_COUNT${NC}"
echo -e "Общий размер: ${GREEN}$TOTAL_SIZE${NC}"

if [ $BACKUP_COUNT -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}📋 Оставшиеся бекапы:${NC}"
    ls -lht "$BACKUP_DIR"/db_backup_*.sql.gz 2>/dev/null | awk '{printf "  %s - %s\n", $9, $5}'
fi

echo "=========================================="
echo -e "${GREEN}✅ Готово!${NC}"
