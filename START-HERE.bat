@echo off
cls
echo.
echo ========================================
echo   MAKSANT COMMAND CENTER
echo   One-Click Startup
echo ========================================
echo.
echo Cleaning up any existing processes...
echo.

REM Kill processes on ports 3000, 3001, and 3010
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 "') do (
    taskkill /F /PID %%a 2>nul
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001 "') do (
    taskkill /F /PID %%a 2>nul
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3010 "') do (
    taskkill /F /PID %%a 2>nul
)

timeout /t 2 /nobreak > nul

echo ========================================
echo   Starting Client Orchestrator API...
echo   (Port 3010)
echo ========================================
echo.

start "Client Orchestrator API" cmd /k "cd client-orchestrator && npm run server"

echo Waiting for Orchestrator to initialize...
timeout /t 3 /nobreak

echo.
echo ========================================
echo   Starting Email Composer API...
echo   (Port 3001)
echo ========================================
echo.

start "Email Composer API" cmd /k "cd email-composer && npm start"

echo Waiting for Email Composer to initialize...
timeout /t 6 /nobreak

echo.
echo ========================================
echo   Starting Command Center UI...
echo   (Port 3000)
echo ========================================
echo.

start "Command Center UI" cmd /k "cd command-center-ui && npm run dev"

echo.
echo ========================================
echo   SERVICES STARTING!
echo ========================================
echo.
echo   Client Orchestrator:  http://localhost:3010
echo   Email Composer API:   http://localhost:3001
echo   Command Center UI:    http://localhost:3000
echo.
echo   Wait 15 seconds for everything to load...
echo.

timeout /t 15 /nobreak

echo   Opening browser...
start http://localhost:3000

echo.
echo ========================================
echo   ALL SYSTEMS READY!
echo ========================================
echo.
echo   Your unified dashboard is now running.
echo   Check the other windows for logs.
echo.
echo   Close this window to keep everything running.
echo ========================================
pause
