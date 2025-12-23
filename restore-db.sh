#!/bin/bash

# Скрипт для восстановления PostgreSQL базы данных из бекапа
# Использование: ./restore-db.sh [путь_к_бекапу или номер_бекапа]
# Примеры:
#   ./restore-db.sh                          # Предложит выбрать последний бекап
#   ./restore-db.sh 1                        # Восстановит из 1-го последнего бекапа
#   ./restore-db.sh backups/db_backup_20231223_120000.sql.gz  # Восстановит из конкретного файла

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BACKUP_DIR="./backups"
CONTAINER_NAME="price-service-db"

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Восстановление базы данных          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Загружаем переменные окружения из .env
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo -e "${RED}❌ Ошибка: файл .env не найден${NC}"
    exit 1
fi

# Проверяем что контейнер запущен
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo -e "${RED}❌ Ошибка: контейнер $CONTAINER_NAME не запущен${NC}"
    echo -e "${YELLOW}💡 Запустите: docker compose up -d${NC}"
    exit 1
fi

# Определяем файл бекапа для восстановления
if [ -z "$1" ]; then
    # Если аргумент не передан, показываем список и предлагаем выбрать
    echo -e "${YELLOW}📋 Доступные бекапы:${NC}"
    echo ""
    
    BACKUPS=($(ls -t "$BACKUP_DIR"/db_backup_*.sql.gz 2>/dev/null))
    
    if [ ${#BACKUPS[@]} -eq 0 ]; then
        echo -e "${RED}❌ Бекапы не найдены в $BACKUP_DIR${NC}"
        exit 1
    fi
    
    for i in "${!BACKUPS[@]}"; do
        SIZE=$(du -h "${BACKUPS[$i]}" | cut -f1)
        DATE=$(stat -f %Sm -t "%Y-%m-%d %H:%M:%S" "${BACKUPS[$i]}" 2>/dev/null || stat -c %y "${BACKUPS[$i]}" | cut -d' ' -f1,2)
        echo "  ${GREEN}$((i + 1))${NC}) $(basename "${BACKUPS[$i]}") - $SIZE ($DATE)"
    done
    
    echo ""
    read -p "Выберите номер бекапа (по умолчанию 1): " CHOICE
    CHOICE=${CHOICE:-1}
    
    if [[ ! "$CHOICE" =~ ^[0-9]+$ ]] || [ "$CHOICE" -lt 1 ] || [ "$CHOICE" -gt ${#BACKUPS[@]} ]; then
        echo -e "${RED}❌ Неверный выбор${NC}"
        exit 1
    fi
    
    BACKUP_FILE="${BACKUPS[$((CHOICE - 1))]}"
elif [[ "$1" =~ ^[0-9]+$ ]]; then
    # Если передан номер, ищем n-й по счету бекап
    BACKUPS=($(ls -t "$BACKUP_DIR"/db_backup_*.sql.gz 2>/dev/null))
    if [ "$1" -lt 1 ] || [ "$1" -gt ${#BACKUPS[@]} ]; then
        echo -e "${RED}❌ Бекап #$1 не найден${NC}"
        exit 1
    fi
    BACKUP_FILE="${BACKUPS[$((1 - 1))]}"
else
    # Иначе используем переданный путь
    BACKUP_FILE="$1"
fi

# Проверяем существование файла
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Ошибка: файл бекапа не найден: $BACKUP_FILE${NC}"
    exit 1
fi

# Предупреждение
echo ""
echo -e "${RED}⚠️  ВНИМАНИЕ!${NC}"
echo -e "Текущая база данных ${RED}$DB_NAME${NC} будет ${RED}перезаписана${NC}!"
echo -e "Файл для восстановления: ${YELLOW}$(basename $BACKUP_FILE)${NC}"
echo ""
read -p "Вы уверены? Введите 'да' для подтверждения: " CONFIRM

if [ "$CONFIRM" != "да" ]; then
    echo -e "${YELLOW}❌ Восстановление отменено${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}🔄 Начинаю восстановление...${NC}"
echo -e "${YELLOW}⏰ Время: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo ""

# Восстанавливаем БД
# Сначала подключаемся к другой БД (postgres) чтобы удалить целевую БД
docker exec "$CONTAINER_NAME" psql \
    -U "$DB_USER" \
    -d postgres \
    -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '$DB_NAME' AND pid <> pg_backend_pid();" \
    --no-password 2>/dev/null || true

# Удаляем старую БД
docker exec "$CONTAINER_NAME" psql \
    -U "$DB_USER" \
    -d postgres \
    -c "DROP DATABASE IF EXISTS $DB_NAME;" \
    --no-password

echo -e "${YELLOW}📥 Восстанавливаю данные из бекапа...${NC}"

# Создаем пустую БД
docker exec "$CONTAINER_NAME" psql \
    -U "$DB_USER" \
    -d postgres \
    -c "CREATE DATABASE $DB_NAME;" \
    --no-password

# Восстанавливаем данные из бекапа
gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" psql \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --no-password > /dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Восстановление успешно завершено!${NC}"
    echo -e "${GREEN}📦 Базе данные $DB_NAME восстановлена${NC}"
    echo -e "${GREEN}⏰ Время: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
else
    echo -e "${RED}❌ Ошибка при восстановлении бекапа${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}💡 Совет: Перезапустите приложение для применения изменений:${NC}"
echo -e "   ${BLUE}docker compose restart app${NC}"
