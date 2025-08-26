# Photo Checklist Configuration System - PowerShell Deployment Script
# This script sets up the database and API for the new photo checklist configuration system

Write-Host "=================================================="
Write-Host "Photo Checklist Configuration System Deployment"
Write-Host "=================================================="

# Configuration
$DB_HOST = "localhost"
$DB_PORT = "3306"
$DB_NAME = "igt_database"
$DB_USER = "root"
$DB_PASS = ""

# Function to run SQL file
function Run-SqlFile {
    param($FilePath)
    
    Write-Host "Running SQL file: $FilePath"
    
    if (Test-Path $FilePath) {
        try {
            mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "source $FilePath"
            Write-Host "✓ Successfully executed: $FilePath" -ForegroundColor Green
        }
        catch {
            Write-Host "✗ Error executing: $FilePath" -ForegroundColor Red
            Write-Host $_.Exception.Message
            exit 1
        }
    }
    else {
        Write-Host "✗ File not found: $FilePath" -ForegroundColor Red
        exit 1
    }
}

# Function to check if file exists
function Test-RequiredFile {
    param($FilePath)
    
    if (-not (Test-Path $FilePath)) {
        Write-Host "✗ Required file not found: $FilePath" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Step 1: Checking required files..."
Test-RequiredFile "database\migrations\create_photo_checklist_tables.sql"
Test-RequiredFile "igt_api\photo-checklist-config.php"
Test-RequiredFile "config\database.php"
Write-Host "✓ All required files found" -ForegroundColor Green

Write-Host ""
Write-Host "Step 2: Setting up database schema..."
try {
    $sqlContent = Get-Content "database\migrations\create_photo_checklist_tables.sql" -Raw
    mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "$sqlContent"
    Write-Host "✓ Database schema created successfully" -ForegroundColor Green
}
catch {
    Write-Host "✗ Error setting up database schema" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}

Write-Host ""
Write-Host "Step 3: Verifying table creation..."
try {
    $tables = mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SHOW TABLES LIKE 'checklist_%';" 2>$null
    
    if ($tables) {
        Write-Host "✓ Database tables created successfully:" -ForegroundColor Green
        Write-Host $tables
    }
    else {
        Write-Host "✗ No checklist tables found. Database setup may have failed." -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Host "✗ Error verifying table creation" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 4: Setting up API permissions..."
if (Test-Path "igt_api\photo-checklist-config.php") {
    Write-Host "✓ API file found and ready" -ForegroundColor Green
}
else {
    Write-Host "✗ API file not found" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 5: Creating upload directories..."
if (-not (Test-Path "uploads\photos")) {
    New-Item -ItemType Directory -Path "uploads\photos" -Force | Out-Null
}
Write-Host "✓ Upload directories created" -ForegroundColor Green

Write-Host ""
Write-Host "Step 6: Testing database connection..."
try {
    $configCount = mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SELECT COUNT(*) as config_count FROM checklist_config;" 2>$null
    
    if ($configCount) {
        Write-Host "✓ Database connection successful" -ForegroundColor Green
        Write-Host "Configuration entries: $configCount"
    }
    else {
        Write-Host "✗ Database connection failed" -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Host "✗ Database connection test failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=================================================="
Write-Host "✓ Deployment completed successfully!" -ForegroundColor Green
Write-Host "=================================================="
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Access the template manager at: /quality/template-manager"
Write-Host "2. Create your first checklist template"
Write-Host "3. Test the system with a work order"
Write-Host ""
Write-Host "For documentation, see:"
Write-Host "docs/photo-checklist-configuration-system.md"
Write-Host ""
Write-Host "API endpoint: /igt_api/photo-checklist-config.php"
Write-Host "Sample API test: Invoke-RestMethod -Uri 'http://your-domain/igt_api/photo-checklist-config.php?request=config' -Method Get"
Write-Host ""

# Pause to let user read the output
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
