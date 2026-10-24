@echo off
chcp 65001 >nul
title Scootogether 2.0 Dispatch Server
cd /d "%~dp0"

echo ========================================================
echo  🛵 Scootogether 2.0 - 次世代機車即時媒合與智慧共乘系統
echo ========================================================
echo.

:: 1. 檢查 Node.js 環境
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] 系統中未找到 Node.js！
    echo 請至 https://nodejs.org 安裝最新 LTS 版本。
    echo.
    pause
    exit /b
)

:: 2. 檢查並釋放可能佔用 Port 3000 的舊進程
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo [INFO] 偵測到 Port 3000 被進程 PID %%a 佔用，正在自動重置釋放...
    taskkill /f /pid %%a >nul 2>&1
)

:: 3. 延遲 1 秒後自動以 Brave (或預設瀏覽器) 開啟展示頁
start "" cmd /c "timeout /t 2 /nobreak >nul && (if exist \"%LOCALAPPDATA%\BraveSoftware\Brave-Browser\Application\brave.exe\" (start \"\" \"%LOCALAPPDATA%\BraveSoftware\Brave-Browser\Application\brave.exe\" \"http://localhost:3000\") else (start http://localhost:3000))"

:: 4. 在當前視窗持續運行伺服器，保留即時日誌
echo [INFO] 正在啟動伺服器，按 Ctrl + C 可隨時停止服務...
echo --------------------------------------------------------
node server.js

:: 5. 防止閃退保護機制
echo.
echo [INFO] 伺服器已停止。
pause
