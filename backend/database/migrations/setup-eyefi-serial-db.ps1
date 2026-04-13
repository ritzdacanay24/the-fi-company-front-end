# ============================================
# EyeFi Serial Numbers Database Setup Script
# This script creates the required database tables and views
# ============================================

Write-Host "EyeFi Serial Numbers Database Setup" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Database configuration
$dbHost = "localhost"  # Change if needed
$dbName = "eyefidb"
$dbUser = "root"       # Change if needed
$sqlFile = "$PSScriptRoot\run_eyefi_serial_setup.sql"

Write-Host "Database: $dbName" -ForegroundColor Yellow
Write-Host "SQL File: $sqlFile" -ForegroundColor Yellow
Write-Host ""

# Check if SQL file exists
if (-not (Test-Path $sqlFile)) {
    Write-Host "ERROR: SQL file not found at $sqlFile" -ForegroundColor Red
    exit 1
}

# Prompt for password
$dbPassword = Read-Host "Enter MySQL password for user '$dbUser'" -AsSecureString
$dbPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword))

Write-Host ""
Write-Host "Running database migration..." -ForegroundColor Green

try {
    # Run the SQL file using mysql command
    $mysqlPath = "mysql"  # Assumes mysql is in PATH
    
    # Execute the SQL file
    & $mysqlPath -h $dbHost -u $dbUser -p$dbPasswordPlain $dbName -e "source $sqlFile"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "SUCCESS! Database tables and views created successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Created:" -ForegroundColor Cyan
        Write-Host "  - eyefi_serial_numbers table" -ForegroundColor White
        Write-Host "  - eyefi_serial_assignments table" -ForegroundColor White
        Write-Host "  - vw_eyefi_serial_summary view" -ForegroundColor White
        Write-Host "  - vw_eyefi_statistics view" -ForegroundColor White
        Write-Host "  - Sample data (10 test records)" -ForegroundColor White
        Write-Host ""
        Write-Host "You can now start using the Serial Number Management feature!" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Failed to execute SQL file. Exit code: $LASTEXITCODE" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
