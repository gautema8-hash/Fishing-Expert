@echo off
chcp 65001 >nul
title 捕鱼达人数据库备份脚本

set DB_NAME=fishing_db
set DB_USER=postgres
set DB_HOST=localhost
set DB_PORT=5432
set BACKUP_DIR=backups
set PG_PASSWORD=postgres

setlocal enabledelayedexpansion

for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YYYY=%dt:~0,4%"
set "MM=%dt:~4,2%"
set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%"
set "MI=%dt:~10,2%"
set "SS=%dt:~12,2%"
set "TIMESTAMP=%YYYY%%MM%%DD%_%HH%%MI%%SS%"

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

set BACKUP_FILE=%BACKUP_DIR%\%DB_NAME%_%TIMESTAMP%.sql

echo ========================================
echo   捕鱼达人数据库备份
echo ========================================
echo 数据库: %DB_NAME%
echo 备份文件: %BACKUP_FILE%
echo.

set PGPASSWORD=%PG_PASSWORD%
pg_dump -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -F p -b -v -f "%BACKUP_FILE%"

if %errorlevel% equ 0 (
    echo [成功] 数据库备份完成
    for %%A in ("%BACKUP_FILE%") do echo 文件大小: %%~zA 字节
) else (
    echo [失败] 数据库备份失败，错误码: %errorlevel%
)

echo.
echo 清理7天前的备份文件...
forfiles /p "%BACKUP_DIR%" /s /m *.sql /d -7 /c "cmd /c del @path" 2>nul

echo [完成] 备份脚本执行完毕
pause
