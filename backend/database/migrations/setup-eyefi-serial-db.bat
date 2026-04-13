@echo off
REM ============================================
REM EyeFi Serial Numbers Database Setup
REM ============================================

echo.
echo EyeFi Serial Numbers Database Setup
echo ====================================
echo.

set DB_HOST=localhost
set DB_NAME=eyefidb
set DB_USER=root
set SQL_FILE=%~dp0run_eyefi_serial_setup.sql

echo Database: %DB_NAME%
echo SQL File: %SQL_FILE%
echo.

if not exist "%SQL_FILE%" (
    echo ERROR: SQL file not found at %SQL_FILE%
    pause
    exit /b 1
)

set /p DB_PASS=Enter MySQL password for user '%DB_USER%': 

echo.
echo Running database migration...
echo.

mysql -h %DB_HOST% -u %DB_USER% -p%DB_PASS% %DB_NAME% < "%SQL_FILE%"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo SUCCESS! Database tables and views created successfully!
    echo.
    echo Created:
    echo   - eyefi_serial_numbers table
    echo   - eyefi_serial_assignments table
    echo   - vw_eyefi_serial_summary view
    echo   - vw_eyefi_statistics view
    echo   - Sample data ^(10 test records^)
    echo.
    echo You can now start using the Serial Number Management feature!
) else (
    echo.
    echo ERROR: Failed to execute SQL file. Exit code: %ERRORLEVEL%
    echo.
    echo Possible issues:
    echo   - MySQL is not in your PATH
    echo   - Incorrect password
    echo   - Database 'eyefidb' does not exist
    echo   - Insufficient permissions
)

echo.
pause
