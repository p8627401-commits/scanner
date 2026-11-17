@echo off
title SmartCard Attendance System Server
echo ========================================================
echo   Starting SmartCard Student Attendance System...
echo ========================================================
echo.
cd /d "%~dp0"

echo Opening browser in 2 seconds...
timeout /t 2 /nobreak >nul
start http://localhost:5000/

echo Server is now running on port 5000!
echo Keep this window open while using the scanner.
echo Press Ctrl+C to stop the server anytime.
echo.
node server/index.js
pause
