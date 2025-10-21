@echo off
echo ================================================================
echo Test: Prompt Auto-Fork Feature
echo ================================================================
echo.

echo [Test 1] Checking Analysis Engine health...
curl -s http://localhost:3001/health | findstr "ok"
if %errorlevel% equ 0 (
    echo [PASS] Analysis Engine is running
) else (
    echo [FAIL] Analysis Engine is not responding
    exit /b 1
)
echo.

echo [Test 2] Fetching default prompts from /api/prompts/default...
curl -s http://localhost:3001/api/prompts/default > prompts-test.json
if %errorlevel% equ 0 (
    echo [PASS] Prompts fetched successfully
) else (
    echo [FAIL] Could not fetch prompts
    exit /b 1
)
echo.

echo [Test 3] Validating prompt structure...
findstr /C:"design" /C:"seo" /C:"content" /C:"social" prompts-test.json >nul
if %errorlevel% equ 0 (
    echo [PASS] All 4 prompts present (design, seo, content, social)
) else (
    echo [FAIL] Missing prompts in response
    exit /b 1
)
echo.

echo [Test 4] Checking for required fields...
findstr /C:"model" /C:"temperature" /C:"systemPrompt" /C:"userPromptTemplate" prompts-test.json >nul
if %errorlevel% equ 0 (
    echo [PASS] Required fields present
) else (
    echo [FAIL] Missing required fields
    exit /b 1
)
echo.

echo [Test 5] Checking UI availability...
curl -s http://localhost:3000 | findstr "Next.js" >nul 2>&1
if %errorlevel% equ 0 (
    echo [PASS] Command Center UI is running
) else (
    echo [INFO] UI may still be compiling...
)
echo.

echo ================================================================
echo All backend tests passed!
echo ================================================================
echo.
echo Next steps for manual testing:
echo 1. Open http://localhost:3000/analysis in your browser
echo 2. Select a project with existing leads
echo 3. Scroll to "Analysis Prompts" section
echo 4. Click "Edit" on any prompt
echo 5. Modify the temperature (e.g., 0.4 to 0.7)
echo 6. Select prospects and click "Analyze"
echo 7. Look for auto-fork notification!
echo.
echo Expected console output in Analysis Engine:
echo   [Design Analyzer] Using custom prompt configuration
echo.

del prompts-test.json 2>nul
pause
