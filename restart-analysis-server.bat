@echo off
echo Stopping Analysis Engine server on port 3001...

REM Find and kill process on port 3001
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do (
    echo Found PID: %%a
    taskkill /F /PID %%a
)

echo Waiting 2 seconds...
timeout /t 2 /nobreak >nul

echo.
echo Starting Analysis Engine server with SSE support...
cd analysis-engine
start cmd /c "node server.js"

echo.
echo Server restart initiated!
echo Check the new terminal window for server status.
echo.
pause
