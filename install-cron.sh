#!/bin/bash

# Скрипт для установки cron задач резервного копирования БД
# Использование: bash install-cron.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Определяем директорию проекта
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Установка Cron задач                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Проверяем что скрипты существуют
if [ ! -f "$PROJECT_DIR/backup-db.sh" ]; then
    echo -e "${RED}❌ Ошибка: $PROJECT_DIR/backup-db.sh не найден${NC}"
    exit 1
fi

if [ ! -f "$PROJECT_DIR/cleanup-backups.sh" ]; then
    echo -e "${RED}❌ Ошибка: $PROJECT_DIR/cleanup-backups.sh не найден${NC}"
    exit 1
fi

# Делаем скрипты исполняемыми
chmod +x "$PROJECT_DIR/backup-db.sh"
chmod +x "$PROJECT_DIR/cleanup-backups.sh"
echo -e "${GREEN}✅ Скрипты сделаны исполняемыми${NC}"

# Создаем директорию для бекапов если ее нет
mkdir -p "$PROJECT_DIR/backups"

echo ""
echo -e "${YELLOW}📋 Выберите конфигурацию:${NC}"
echo ""
echo "  ${GREEN}1${NC}) Ежедневный бекап в 02:00 (рекомендуется) - 30 дней истории"
echo "  ${GREEN}2${NC}) Каждые 6 часов - 7 дней истории (для production)"
echo "  ${GREEN}3${NC}) Каждый час - 3 дня истории (для высоконагруженных систем)"
echo "  ${GREEN}4${NC}) Отмена"
echo ""
read -p "Введите номер (по умолчанию 1): " CHOICE
CHOICE=${CHOICE:-1}

case $CHOICE in
    1)
        echo -e "${YELLOW}🔄 Установка конфигурации: Ежедневный бекап в 02:00 UTC${NC}"
        BACKUP_SCHEDULE="0 2 * * *"
        CLEANUP_DAYS="30"
        ;;
    2)
        echo -e "${YELLOW}🔄 Установка конфигурации: Каждые 6 часов${NC}"
        BACKUP_SCHEDULE="0 */6 * * *"
        CLEANUP_DAYS="7"
        ;;
    3)
        echo -e "${YELLOW}🔄 Установка конфигурации: Каждый час${NC}"
        BACKUP_SCHEDULE="0 * * * *"
        CLEANUP_DAYS="3"
        ;;
    4)
        echo -e "${YELLOW}❌ Отмена${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}❌ Неверный выбор${NC}"
        exit 1
        ;;
esac

echo ""

# Удаляем старые задачи если они есть
echo -e "${YELLOW}🧹 Удаляю старые cron задачи...${NC}"
crontab -l 2>/dev/null | grep -v "backup-db.sh" | grep -v "cleanup-backups.sh" | crontab - 2>/dev/null || true

# Добавляем новые задачи
echo -e "${YELLOW}➕ Добавляю новые cron задачи...${NC}"

# Задача на бекап
(crontab -l 2>/dev/null || true; echo "$BACKUP_SCHEDULE $PROJECT_DIR/backup-db.sh >> $PROJECT_DIR/backups/backup.log 2>&1") | crontab -
echo -e "${GREEN}  ✅ Бекап: $BACKUP_SCHEDULE${NC}"

# Задача на очистку
CLEANUP_HOUR=$((2 + RANDOM % 22))  # Выбираем случайный час между 02:00 и 23:00 чтобы не перегружать систему
(crontab -l 2>/dev/null || true; echo "0 $CLEANUP_HOUR * * * $PROJECT_DIR/cleanup-backups.sh $CLEANUP_DAYS >> $PROJECT_DIR/backups/cleanup.log 2>&1") | crontab -
echo -e "${GREEN}  ✅ Очистка: 0 $CLEANUP_HOUR * * * (каждый день в $CLEANUP_HOUR:00)${NC}"

echo ""
echo -e "${YELLOW}📋 Текущие cron задачи:${NC}"
echo "=========================================="
crontab -l 2>/dev/null | grep -E "backup-db|cleanup-backups"
echo "=========================================="

echo ""
echo -e "${GREEN}✅ Cron задачи успешно установлены!${NC}"
echo ""
echo -e "${YELLOW}💡 Полезные команды:${NC}"
echo "  • Просмотр всех задач: ${BLUE}crontab -l${NC}"
echo "  • Редактировать задачи: ${BLUE}crontab -e${NC}"
echo "  • Удалить все задачи: ${BLUE}crontab -r${NC}"
echo "  • Логи бекапов: ${BLUE}tail -f $PROJECT_DIR/backups/backup.log${NC}"
echo "  • Логи очистки: ${BLUE}tail -f $PROJECT_DIR/backups/cleanup.log${NC}"
echo ""
echo -e "${YELLOW}🧪 Протестируйте бекап вручную:${NC}"
echo "  ${BLUE}$PROJECT_DIR/backup-db.sh${NC}"
echo ""
