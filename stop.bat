@echo off
echo ========================================
echo  MAKSANT COMMAND CENTER
echo  Stopping all services...
echo ========================================
echo.

echo Stopping Email Composer (port 3001)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001') do taskkill /F /PID %%a 2>nul

echo Stopping Command Center UI (port 3000)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do taskkill /F /PID %%a 2>nul

echo.
echo All services stopped!
echo.
pause
