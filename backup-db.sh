#!/bin/bash

# Скрипт для бекапа PostgreSQL базы данных
# Сохраняет полный дамп БД в архивированный файл
# Использование: ./backup-db.sh

set -e

# Получаем директорию скрипта
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Параметры
BACKUP_DIR="$SCRIPT_DIR/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/db_backup_$TIMESTAMP.sql.gz"
CONTAINER_NAME="price-service-db"
MAX_BACKUPS=30  # Хранить последние 30 бекапов

# Создаем директорию для бекапов если ее нет
if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${YELLOW}📁 Создаю директорию $BACKUP_DIR...${NC}"
    mkdir -p "$BACKUP_DIR"
fi

echo -e "${YELLOW}🔄 Начинаю бекап базы данных...${NC}"
echo -e "${YELLOW}⏰ Время: $(date '+%Y-%m-%d %H:%M:%S')${NC}"

# Загружаем переменные окружения из .env
if [ -f "$SCRIPT_DIR/.env" ]; then
    export $(cat "$SCRIPT_DIR/.env" | grep -v '^#' | xargs)
else
    echo -e "${RED}❌ Ошибка: файл .env не найден в $SCRIPT_DIR${NC}"
    exit 1
fi

# Проверяем что контейнер запущен
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo -e "${RED}❌ Ошибка: контейнер $CONTAINER_NAME не запущен${NC}"
    echo -e "${YELLOW}💡 Запустите: docker compose up -d${NC}"
    exit 1
fi

# Выполняем бекап
echo -e "${YELLOW}📊 Экспортирую базу данных $DB_NAME...${NC}"

docker exec "$CONTAINER_NAME" pg_dump \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --verbose \
    --no-password | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✅ Бекап успешно создан!${NC}"
    echo -e "${GREEN}📦 Файл: $BACKUP_FILE${NC}"
    echo -e "${GREEN}📏 Размер: $SIZE${NC}"
else
    echo -e "${RED}❌ Ошибка при создании бекапа${NC}"
    exit 1
fi

# Удаляем старые бекапы (оставляем только последние MAX_BACKUPS)
echo -e "${YELLOW}🧹 Удаляю старые бекапы (оставляю последние $MAX_BACKUPS)...${NC}"

OLD_BACKUPS=$(ls -t "$BACKUP_DIR"/db_backup_*.sql.gz 2>/dev/null | tail -n +$((MAX_BACKUPS + 1)))

if [ ! -z "$OLD_BACKUPS" ]; then
    echo "$OLD_BACKUPS" | while read backup; do
        echo -e "${YELLOW}  🗑️  Удаляю: $(basename $backup)${NC}"
        rm "$backup"
    done
else
    echo -e "${YELLOW}  (нет старых бекапов для удаления)${NC}"
fi

# Показываем статистику
echo ""
echo -e "${YELLOW}📈 Статистика бекапов:${NC}"
echo "=========================================="
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/db_backup_*.sql.gz 2>/dev/null | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
echo -e "Всего бекапов: ${GREEN}$BACKUP_COUNT${NC}"
echo -e "Общий размер: ${GREEN}$TOTAL_SIZE${NC}"
echo ""
echo -e "${YELLOW}📋 Последние 5 бекапов:${NC}"
ls -lht "$BACKUP_DIR"/db_backup_*.sql.gz 2>/dev/null | head -5 | awk '{print $9, "(" $5 ")"}'
echo "=========================================="

echo -e "${GREEN}🎉 Готово!${NC}"
