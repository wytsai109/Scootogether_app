@echo off
chcp 65001 >nul
title Scootogether 2.0 Dispatch Server Launcher
echo ========================================================
echo  🛵 Scootogether 2.0 - 次世代機車即時媒合與智慧共乘系統
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/3] 檢查 Node.js 執行環境...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] 未偵測到 Node.js，請先安裝 Node.js 20+。
    pause
    exit /b
)

echo [2/3] 正在啟動 Scootogether 2.0 即時伺服器 (Port 3000)...
start /b cmd /c "node server.js"
timeout /t 2 /nobreak >nul

echo [3/3] 正在以 Brave 瀏覽器啟動調度中控台...
set "BRAVE_PATH=%LOCALAPPDATA%\BraveSoftware\Brave-Browser\Application\brave.exe"
if exist "%BRAVE_PATH%" (
    start "" "%BRAVE_PATH%" "http://localhost:3000"
) else (
    start http://localhost:3000
)

echo.
echo ========================================================
echo  ✅ 伺服器已成功運行於 http://localhost:3000
echo  您可以在瀏覽器體驗全城即時調度地圖、乘客叫車與司機接單！
echo ========================================================
