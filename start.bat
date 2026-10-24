@echo off
title Scootogether 2.0 - Dispatch Server
cd /d "%~dp0"

echo ========================================================
echo  Scootogether 2.0 - Dispatch Server
echo ========================================================
echo.

powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"

start "" cmd /c "timeout /t 2 /nobreak >nul & (if exist "%LOCALAPPDATA%\BraveSoftware\Brave-Browser\Application\brave.exe" (start "" "%LOCALAPPDATA%\BraveSoftware\Brave-Browser\Application\brave.exe" "http://localhost:3000") else (start http://localhost:3000))"

echo Server is running at http://localhost:3000
echo Press Ctrl+C to stop the server.
echo.
node server.js
pause
