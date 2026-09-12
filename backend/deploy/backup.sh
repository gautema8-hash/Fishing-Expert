#!/bin/bash
# 捕鱼达人数据库备份脚本 - Linux
# 可配置crontab定时执行：0 2 * * * /path/to/backup.sh

DB_NAME="fishing_db"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"
BACKUP_DIR="/data/backups/fishing"
RETENTION_DAYS=7
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql"

# 创建备份目录
mkdir -p "$BACKUP_DIR"

echo "========================================"
echo "  捕鱼达人数据库备份"
echo "========================================"
echo "数据库: $DB_NAME"
echo "备份文件: $BACKUP_FILE"
echo ""

# 执行备份
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -F p -b -v -f "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "[成功] 数据库备份完成"
    ls -lh "$BACKUP_FILE" | awk '{print "文件大小: " $5}'
else
    echo "[失败] 数据库备份失败"
    exit 1
fi

# 压缩备份
gzip "$BACKUP_FILE"
echo "[信息] 已压缩为 ${BACKUP_FILE}.gz"

# 清理过期备份
echo ""
echo "清理${RETENTION_DAYS}天前的备份文件..."
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
echo "[完成] 过期备份已清理"

echo ""
echo "[完成] 备份脚本执行完毕"
