# Update Database View - Add batch_id

## Steps to Update the View

You need to run the updated SQL view script to add the `batch_id` column.

### Option 1: Using MySQL Command Line
```bash
mysql -u your_username -p eyefidb < "c:/Users/rdacanay/Eyefi/modern/database/views/vw_all_consumed_serials.sql"
```

### Option 2: Using MySQL Workbench or phpMyAdmin
1. Open MySQL Workbench or phpMyAdmin
2. Connect to your database
3. Open the file: `database/views/vw_all_consumed_serials.sql`
4. Execute the entire script

### Option 3: Copy and Execute Directly
1. Open the file `database/views/vw_all_consumed_serials.sql`
2. Copy all contents
3. Paste into your MySQL client
4. Execute

### Verify the Update
After running the script, verify with:
```sql
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'eyefidb' 
  AND TABLE_NAME = 'vw_all_consumed_serials'
  AND COLUMN_NAME = 'batch_id';
```

This should return one row showing the `batch_id` column exists.

### Test the API
After updating the view, test the API endpoint:
```
https://dashboard.eye-fi.com/server/Api/serial-assignments/index.php?action=get_all_consumed_serials&page=1&limit=10
```

The response should now include `batch_id` in each record.
