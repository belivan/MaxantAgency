@echo off
REM Run database migration for model tracking and accessibility fields
REM Usage: run-migration.bat

echo Running migration: add-model-tracking-and-accessibility.sql
echo.

REM Load environment variables
if exist ..\.env (
    for /f "tokens=1,2 delims==" %%a in (..\.env) do (
        if "%%a"=="SUPABASE_URL" set SUPABASE_URL=%%b
        if "%%a"=="SUPABASE_SERVICE_KEY" set SUPABASE_SERVICE_KEY=%%b
    )
)

if "%SUPABASE_URL%"=="" (
    echo ERROR: SUPABASE_URL not set in .env file
    pause
    exit /b 1
)

echo Connecting to database...
echo.

REM Extract connection details from Supabase URL
REM You'll need to run this SQL directly in Supabase SQL Editor or using psql

echo.
echo MANUAL MIGRATION REQUIRED:
echo.
echo 1. Open Supabase SQL Editor at: %SUPABASE_URL%
echo 2. Copy and paste the contents of: add-model-tracking-and-accessibility.sql
echo 3. Run the SQL script
echo.
echo OR use psql:
echo.
echo psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-HOST]:5432/postgres" -f add-model-tracking-and-accessibility.sql
echo.

pause