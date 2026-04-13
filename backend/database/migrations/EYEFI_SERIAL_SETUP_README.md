# EyeFi Serial Number Management - Database Setup

## Problem
The application is trying to query a database view `vw_eyefi_serial_summary` that doesn't exist yet.

## Solution
Run the database migration to create the required tables and views.

## Setup Instructions

### Option 1: Using PowerShell Script (Recommended for Windows)

1. Open PowerShell as Administrator
2. Navigate to the migrations folder:
   ```powershell
   cd c:\Users\rdacanay\Eyefi\modern\database\migrations
   ```
3. Run the setup script:
   ```powershell
   .\setup-eyefi-serial-db.ps1
   ```
4. Enter your MySQL password when prompted

### Option 2: Using MySQL Command Line

1. Open Command Prompt or PowerShell
2. Navigate to the migrations folder:
   ```bash
   cd c:\Users\rdacanay\Eyefi\modern\database\migrations
   ```
3. Run the SQL file:
   ```bash
   mysql -u root -p eyefidb < run_eyefi_serial_setup.sql
   ```
4. Enter your MySQL password when prompted

### Option 3: Using MySQL Workbench

1. Open MySQL Workbench
2. Connect to your database server
3. Open the file `run_eyefi_serial_setup.sql`
4. Click the Execute button (lightning bolt icon)

### Option 4: Manual SQL Execution

1. Connect to your MySQL database using any client
2. Select the `eyefidb` database
3. Copy and paste the contents of `run_eyefi_serial_setup.sql`
4. Execute the SQL commands

## What Gets Created

The migration creates:

### Tables
- **eyefi_serial_numbers** - Main table for storing EyeFi device serial numbers
- **eyefi_serial_assignments** - Tracks customer and work order assignments

### Views
- **vw_eyefi_serial_summary** - Combined view of serial numbers with assignment info
- **vw_eyefi_statistics** - Statistics view for dashboard metrics

### Sample Data
- 10 sample serial numbers for testing (EYEFI-001 through EYEFI-010)

## Verification

After running the migration, verify it worked:

```sql
-- Check if tables exist
SHOW TABLES LIKE 'eyefi%';

-- Check if views exist
SHOW FULL TABLES WHERE TABLE_TYPE = 'VIEW';

-- View sample data
SELECT * FROM vw_eyefi_serial_summary;

-- View statistics
SELECT * FROM vw_eyefi_statistics;
```

## Database Configuration

Make sure your database connection is configured correctly:
- **Host**: localhost (or your database server)
- **Database**: eyefidb
- **User**: root (or your database user)
- **Password**: (your MySQL password)

The backend API expects the database to be named `eyefidb`. If you use a different name, update the connection settings in:
- `backend/config/database.php`

## Troubleshooting

### Error: "Access denied for user"
- Check your MySQL username and password
- Ensure the user has permissions on the `eyefidb` database

### Error: "Unknown database 'eyefidb'"
- Create the database first:
  ```sql
  CREATE DATABASE eyefidb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  ```

### Error: "Table already exists"
- The script includes `DROP TABLE IF EXISTS` statements
- If you still have issues, manually drop the tables first:
  ```sql
  DROP VIEW IF EXISTS vw_eyefi_statistics;
  DROP VIEW IF EXISTS vw_eyefi_serial_summary;
  DROP TABLE IF EXISTS eyefi_serial_assignments;
  DROP TABLE IF EXISTS eyefi_serial_numbers;
  ```

## Next Steps

After the database is set up:

1. Refresh your Angular application
2. Navigate to the Serial Number Management page
3. You should see the 10 sample records
4. Test creating, editing, and assigning serial numbers

## Need Help?

If you encounter any issues:
1. Check the MySQL error log
2. Verify database connection settings
3. Ensure the database user has proper permissions
4. Check that the backend PHP server is running
