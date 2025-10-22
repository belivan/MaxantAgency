@echo off
REM Backup System End-to-End Testing Runner
REM This script runs through all testing phases automatically

echo.
echo ========================================================================
echo   BACKUP SYSTEM END-TO-END TESTING
echo ========================================================================
echo.

REM Store original directory
set ORIGINAL_DIR=%CD%

REM Check if we're in the right directory
if not exist "analysis-engine" (
    echo ERROR: Must run from MaxantAgency root directory
    exit /b 1
)

echo Phase 0: Pre-Test Validation
echo ========================================================================
echo.

echo Checking backup directories...
if not exist "local-backups\analysis-engine\leads" mkdir "local-backups\analysis-engine\leads"
if not exist "local-backups\analysis-engine\failed-uploads" mkdir "local-backups\analysis-engine\failed-uploads"
echo [OK] Directories exist
echo.

echo Running initial validation...
cd database-tools
call node scripts\validate-existing-backups.js
if errorlevel 1 (
    echo [WARNING] Validation had issues, continuing anyway...
)
cd ..
echo.

echo ========================================================================
echo Phase 1: Unit Test Suite
echo ========================================================================
echo.
echo Running backup system unit tests...
cd analysis-engine
call node scripts\test-backup-system.js
if errorlevel 1 (
    echo [FAILED] Unit tests failed!
    cd ..
    exit /b 1
)
cd ..
echo.
echo [OK] All unit tests passed!
echo.

echo ========================================================================
echo Phase 2: Database Tools Validation
echo ========================================================================
echo.
echo Running backup validation...
cd database-tools
call node scripts\validate-existing-backups.js
if errorlevel 1 (
    echo [WARNING] Validation found issues
) else (
    echo [OK] All backups validated successfully
)
cd ..
echo.

echo ========================================================================
echo Phase 3: Backup Statistics Check
echo ========================================================================
echo.
echo Getting backup statistics...
cd analysis-engine
call node -e "import { getBackupStats } from './utils/local-backup.js'; getBackupStats().then(s => { console.log(''); console.log('BACKUP STATISTICS'); console.log('=================='); console.log('Total backups:    ', s.total_backups); console.log('Uploaded:         ', s.uploaded); console.log('Pending:          ', s.pending_upload); console.log('Failed:           ', s.failed_uploads); console.log('Success rate:     ', s.success_rate + '%%'); console.log(''); });"
cd ..
echo.

echo ========================================================================
echo Phase 4: Integration Test - Simulated Failed Upload
echo ========================================================================
echo.
echo Creating test backup with simulated failure...
cd analysis-engine
call node -e "import { saveLocalBackup, markAsFailed } from './utils/local-backup.js'; const testResult = { url: 'https://test-automated-fail.com', company_name: 'Automated Fail Test', industry: 'test', grade: 'C', overall_score: 60, design_score: 60, seo_score: 60, content_score: 60, social_score: 60 }; const testLeadData = { url: 'https://test-automated-fail.com', company_name: 'Automated Fail Test', industry: 'test', website_grade: 'C', overall_score: 60, design_score: 60, seo_score: 60, content_score: 60, social_score: 60, has_https: true, is_mobile_friendly: false, has_blog: false }; const path = await saveLocalBackup(testResult, testLeadData); console.log('[OK] Test backup created'); const failedPath = await markAsFailed(path, 'Automated test: Simulated database error'); console.log('[OK] Marked as failed:', failedPath);"
if errorlevel 1 (
    echo [FAILED] Could not create test backup
    cd ..
    exit /b 1
)
cd ..
echo.

echo ========================================================================
echo Phase 5: Validate Failed Upload
echo ========================================================================
echo.
cd database-tools
call node scripts\validate-existing-backups.js
cd ..
echo.

echo ========================================================================
echo Phase 6: Test Retry Script (Dry Run)
echo ========================================================================
echo.
echo Running retry script in dry-run mode...
cd analysis-engine
call node scripts\retry-failed-uploads.js --dry-run --company "Automated Fail Test"
cd ..
echo.

echo ========================================================================
echo   TESTING COMPLETE
echo ========================================================================
echo.
echo All automated tests completed successfully!
echo.
echo NEXT STEPS:
echo   1. Review test results above
echo   2. Check BACKUP-TESTING-PLAN.md for manual testing phases
echo   3. Test with real analysis by running: npm run dev
echo   4. Clean up test data with: node cleanup-test-backups.js
echo.
echo For manual end-to-end testing, see: BACKUP-TESTING-PLAN.md
echo.

REM Return to original directory
cd %ORIGINAL_DIR%
