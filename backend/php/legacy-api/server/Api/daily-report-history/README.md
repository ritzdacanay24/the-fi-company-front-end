# Daily Report History API Setup Guide

## Overview
The Daily Report History feature provides a complete frontend and backend solution for storing, retrieving, filtering, and searching daily reports with JSON data.

## Backend Setup

### 1. Create Database Table
Run the migration SQL:
```bash
mysql -u [username] -p [database_name] < backend/database/migrations/001_create_daily_reports_table.sql
```

Or execute the SQL manually in phpMyAdmin or your database client.

### 2. API Endpoint
**Location:** `/backend/api/daily-report-history/index.php`

**Method:** GET  

**URL:** `http://your-domain/api/daily-report-history/`

### 3. Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `startDate` | string (YYYY-MM-DD) | Filter reports from this date | `2026-01-01` |
| `endDate` | string (YYYY-MM-DD) | Filter reports until this date | `2026-03-02` |
| `status` | string | Filter by status (Live Report, Archived) | `Live Report` |
| `search` | string | Search in JSON data and date fields | `inventory` |
| `page` | integer | Pagination page (default: 1) | `1` |
| `limit` | integer | Results per page (default: 10, max: 50) | `10` |

### 4. Example Requests

**Get all reports:**
```
GET /api/daily-report-history/
```

**Filter by date range:**
```
GET /api/daily-report-history/?startDate=2026-03-01&endDate=2026-03-02
```

**Search for inventory data:**
```
GET /api/daily-report-history/?search=inventory&status=Live%20Report
```

**Paginated results:**
```
GET /api/daily-report-history/?page=2&limit=20
```

### 5. Response Format

**Success (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "createdDate": "2026-03-02T10:00:00",
      "status": "Live Report",
      "data": {
        "total_open": 374,
        "inventory_value": 5020377.14,
        "on_time_delivery_today_percent": 100,
        "last_refreshed": "2026-02-27 16:00:02"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

**Error (500 Internal Server Error):**
```json
{
  "success": false,
  "error": "Failed to retrieve daily reports",
  "message": "Database connection error"
}
```

## Frontend Setup

### 1. Component Files
- `daily-report-history.component.ts` - Component logic
- `daily-report-history.component.html` - Template
- `daily-report-history.component.scss` - Styles
- `daily-report-history.service.ts` - API service

### 2. Features
✅ **Search** - Full-text search in JSON data  
✅ **Date Filtering** - Filter by date range  
✅ **Status Filtering** - Filter by report status  
✅ **Pagination** - Navigate through results  
✅ **Detail View** - Expand to see full JSON data  
✅ **Export** - Download reports as JSON files  
✅ **Responsive Design** - Works on mobile and desktop  

### 3. Integration

Add to your reports component or routing:

```typescript
import { DailyReportHistoryComponent } from './daily-report-history/daily-report-history.component';

// In your route definitions:
{
  path: 'daily-history',
  component: DailyReportHistoryComponent
}
```

Or add a link in your reports dashboard:
```typescript
navigateToHistory() {
  this.router.navigate(['/operations/reports/daily-history']);
}
```

## Data Import

To populate the table with existing daily reports:

```php
<?php
// Import JSON report data into daily_reports table
$reportData = [
  'ss' => ['total' => null],
  'all' => [
    'total' => '5020377.13986431000000000000',
    'lessthanone' => '3316656.29807897000000000000',
    'greaterthanorequaltoone' => '1703720.84178534000000000000'
  ],
  'wip' => '182600.8450000000',
  // ... more data
];

$stmt = $pdo->prepare("INSERT INTO daily_reports (created_date, status, data) VALUES (?, ?, ?)");
$stmt->execute([
  date('Y-m-d H:i:s'),
  'Live Report',
  json_encode($reportData)
]);
?>
```

## Performance Optimization

### Indexes
The table includes indexes on:
- `created_date` - For date range queries
- `status` - For status filtering
- FULLTEXT on `data` - For JSON searching

### Query Examples
```sql
-- Get reports from last 30 days
SELECT * FROM daily_reports 
WHERE created_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
ORDER BY created_date DESC;

-- Search by total_open value
SELECT * FROM daily_reports 
WHERE JSON_EXTRACT(data, '$.total_open') > 300
ORDER BY created_date DESC;

-- Get on-time delivery trends
SELECT created_date, 
       JSON_EXTRACT(data, '$.on_time_delivery_today_percent') AS on_time_percent
FROM daily_reports
WHERE created_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)
ORDER BY created_date;
```

## Troubleshooting

### API Returns 500 Error
1. Check database connection in `/backend/config/database.php`
2. Verify table exists: `SHOW TABLES LIKE 'daily_reports';`
3. Check error logs for PHP errors

### Searches Not Working
1. Ensure `FULLTEXT` index exists on `data` column
2. Search requires minimum 3 characters
3. Check JSON data format matches expected schema

### No Results Displayed
1. Verify table contains data
2. Check date format (must be YYYY-MM-DD)
3. Open browser Network tab to debug API response

## Future Enhancements
- [ ] Scheduled automated report generation
- [ ] Email report exports
- [ ] Data visualization/graphing
- [ ] Report comparison (period vs period)
- [ ] Custom field filtering
- [ ] Role-based access control
