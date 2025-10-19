@echo off
cls
echo.
echo ========================================
echo   MAKSANT COMMAND CENTER
echo   Stopping All Services
echo ========================================
echo.

echo Stopping Client Orchestrator API (port 3010)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3010 "') do (
    echo   Killing PID %%a
    taskkill /F /PID %%a 2>nul
)

echo.
echo Stopping Email Composer API (port 3001)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001 "') do (
    echo   Killing PID %%a
    taskkill /F /PID %%a 2>nul
)

echo.
echo Stopping Command Center UI (port 3000)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 "') do (
    echo   Killing PID %%a
    taskkill /F /PID %%a 2>nul
)

echo.
echo ========================================
echo   ALL SERVICES STOPPED!
echo ========================================
echo.
pause
