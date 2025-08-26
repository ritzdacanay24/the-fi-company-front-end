#!/bin/bash

# Photo Checklist Configuration System - Deployment Script
# This script sets up the database and API for the new photo checklist configuration system

echo "=================================================="
echo "Photo Checklist Configuration System Deployment"
echo "=================================================="

# Configuration
DB_HOST="localhost"
DB_PORT="3306"
DB_NAME="igt_database"
DB_USER="root"
DB_PASS=""

# Function to run SQL file
run_sql_file() {
    local file=$1
    echo "Running SQL file: $file"
    
    if [ -f "$file" ]; then
        mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$file"
        if [ $? -eq 0 ]; then
            echo "✓ Successfully executed: $file"
        else
            echo "✗ Error executing: $file"
            exit 1
        fi
    else
        echo "✗ File not found: $file"
        exit 1
    fi
}

# Function to check if file exists
check_file() {
    local file=$1
    if [ ! -f "$file" ]; then
        echo "✗ Required file not found: $file"
        exit 1
    fi
}

echo ""
echo "Step 1: Checking required files..."
check_file "database/migrations/create_photo_checklist_tables.sql"
check_file "igt_api/photo-checklist-config.php"
check_file "config/database.php"
echo "✓ All required files found"

echo ""
echo "Step 2: Setting up database schema..."
run_sql_file "database/migrations/create_photo_checklist_tables.sql"

echo ""
echo "Step 3: Verifying table creation..."
mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SHOW TABLES LIKE 'checklist_%';" > /tmp/checklist_tables.txt

if [ -s /tmp/checklist_tables.txt ]; then
    echo "✓ Database tables created successfully:"
    cat /tmp/checklist_tables.txt
    rm /tmp/checklist_tables.txt
else
    echo "✗ No checklist tables found. Database setup may have failed."
    exit 1
fi

echo ""
echo "Step 4: Setting up API permissions..."
if [ -f "igt_api/photo-checklist-config.php" ]; then
    chmod 644 "igt_api/photo-checklist-config.php"
    echo "✓ API file permissions set"
else
    echo "✗ API file not found"
    exit 1
fi

echo ""
echo "Step 5: Creating upload directories..."
mkdir -p "uploads/photos"
chmod 755 "uploads/photos"
echo "✓ Upload directories created"

echo ""
echo "Step 6: Testing database connection..."
mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SELECT COUNT(*) as config_count FROM checklist_config;" > /tmp/db_test.txt

if [ -s /tmp/db_test.txt ]; then
    echo "✓ Database connection successful"
    echo "Configuration entries:"
    cat /tmp/db_test.txt
    rm /tmp/db_test.txt
else
    echo "✗ Database connection failed"
    exit 1
fi

echo ""
echo "=================================================="
echo "✓ Deployment completed successfully!"
echo "=================================================="
echo ""
echo "Next steps:"
echo "1. Access the template manager at: /quality/template-manager"
echo "2. Create your first checklist template"
echo "3. Test the system with a work order"
echo ""
echo "For documentation, see:"
echo "docs/photo-checklist-configuration-system.md"
echo ""
echo "API endpoint: /igt_api/photo-checklist-config.php"
echo "Sample API test: curl -X GET 'http://your-domain/igt_api/photo-checklist-config.php?request=config'"
echo ""
