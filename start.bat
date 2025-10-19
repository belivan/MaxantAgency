@echo off
echo ========================================
echo  MAKSANT COMMAND CENTER
echo  Starting all services...
echo ========================================
echo.

REM Kill any existing processes on ports 3000 and 3001
echo Checking for existing services...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001') do taskkill /F /PID %%a 2>nul
timeout /t 1 /nobreak > nul

REM Start email-composer on port 3001
echo [1/2] Starting Email Composer API (port 3001)...
start "Email Composer API - Port 3001" cmd /k "cd email-composer && npm start"

REM Wait 5 seconds for email-composer to initialize
echo Waiting for Email Composer to start...
timeout /t 5 /nobreak

REM Start command-center-ui on port 3000
echo [2/2] Starting Command Center UI (port 3000)...
start "Command Center UI - Port 3000" cmd /k "cd command-center-ui && npm run dev"

echo.
echo ========================================
echo  All services starting!
echo ========================================
echo.
echo  Email Composer API: http://localhost:3001
echo  Command Center UI:  http://localhost:3000
echo.
echo  Wait 10 seconds, then open:
echo  http://localhost:3000
echo.
echo  Press any key to open browser...
echo ========================================
pause > nul

start http://localhost:3000
