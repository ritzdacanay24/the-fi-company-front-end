# Comprehensive Consumed Serials View

## Overview
A unified system to view **ALL consumed/used serial numbers** from multiple sources in one comprehensive view.

## Data Sources

The system aggregates consumed serials from **5 different sources**:

1. **serial_assignments** (New System)
   - New unified assignment table
   - Tracks EyeFi serials and UL labels
   - Status: consumed, active, cancelled, returned
   - Supports voiding and restoration

2. **ul_label_usages** (Legacy)
   - Historical UL label usages
   - Links EyeFi serials with UL labels
   - Work order tracking

3. **agsSerialGenerator** (Legacy)
   - AGS serial number generation records
   - Customer: AGS (Apollo Gaming Systems)
   - Property site and inspector tracking

4. **sgAssetGenerator** (Legacy)
   - SG asset number generation records
   - Customer: SG (Scientific Games / Light & Wonder)
   - Property site and inspector tracking

5. **igt_serial_numbers** (Only 'used' status)
   - IGT serial number records
   - **Only includes serials with status = 'used'**
   - Tracks when and by whom the serial was used

## Database Views

### 1. Main View: `vw_all_consumed_serials`

Comprehensive UNION of all consumed serials from all sources.

**Columns:**
- `unique_id` - Unique identifier with prefix (SA-, UL-, AGS-, SG-, IGT-)
- `source_table` - Origin table name
- `source_type` - Human-readable source type
- `source_id` - ID from source table
- `eyefi_serial_id` - EyeFi serial ID (if applicable)
- `eyefi_serial_number` - EyeFi serial number
- `ul_label_id` - UL label ID (if applicable)
- `ul_number` - UL label number
- `igt_serial_id` - IGT serial ID (if applicable)
- `igt_serial_number` - IGT serial number
- `ags_serial_id` - AGS serial ID (if applicable)
- `ags_serial_number` - AGS generated serial
- `sg_asset_id` - SG asset ID (if applicable)
- `sg_asset_number` - SG asset number
- `wo_number` - Work order number
- `used_date` - Date when consumed/used
- `used_by` - User who consumed/used it
- `status` - Current status
- `is_voided` - Whether assignment is voided
- `voided_at`, `voided_by`, `void_reason` - Void tracking
- `created_at` - Record creation date
- `part_number`, `property_site`, `inspector_name`, `customer_name`, `po_number` - Additional details

**Usage:**
```sql
-- Get all consumed serials (paginated)
SELECT * FROM vw_all_consumed_serials LIMIT 50;

-- Search for specific serial
SELECT * FROM vw_all_consumed_serials 
WHERE eyefi_serial_number LIKE '%147207%';

-- Get all serials for work order
SELECT * FROM vw_all_consumed_serials 
WHERE wo_number = '40745' OR po_number = '40745';

-- Get serials consumed by user
SELECT * FROM vw_all_consumed_serials 
WHERE used_by = 'Richard Hernandez'
ORDER BY used_date DESC;
```

### 2. Summary View: `vw_consumed_serials_summary`

Statistics grouped by source table.

**Columns:**
- `source_table` - Source table name
- `source_type` - Human-readable type
- `total_consumed` - Total count
- `unique_eyefi_serials` - Count of unique EyeFi serials
- `unique_ul_labels` - Count of unique UL labels
- `unique_igt_serials` - Count of unique IGT serials
- `unique_ags_serials` - Count of unique AGS serials
- `unique_sg_assets` - Count of unique SG assets
- `first_usage_date` - Earliest usage date
- `last_usage_date` - Latest usage date
- `consumed_today` - Count consumed today
- `consumed_this_week` - Count consumed this week
- `consumed_this_month` - Count consumed this month

**Usage:**
```sql
SELECT * FROM vw_consumed_serials_summary;
```

### 3. Trend View: `vw_daily_consumption_trend`

Daily consumption statistics for the last 30 days.

**Columns:**
- `consumption_date` - Date
- `source_table` - Source table
- `source_type` - Source type
- `daily_count` - Total count for the day
- `eyefi_count`, `ul_count`, `igt_count`, `ags_count`, `sg_count` - Counts by type

**Usage:**
```sql
SELECT * FROM vw_daily_consumption_trend;
```

### 4. User Activity View: `vw_user_consumption_activity`

User activity summary.

**Columns:**
- `used_by` - User name
- `source_table` - Source table
- `total_consumed` - Total consumed by user
- `first_consumption` - First consumption date
- `last_consumption` - Last consumption date
- `consumed_today` - Count consumed today

**Usage:**
```sql
SELECT * FROM vw_user_consumption_activity;
```

### 5. Work Order View: `vw_work_order_serials`

Serials grouped by work order.

**Columns:**
- `work_order` - Work order / PO number
- `source_table` - Source table
- `serial_count` - Count of serials
- `eyefi_serials` - Comma-separated EyeFi serials
- `ul_numbers` - Comma-separated UL labels
- `igt_serials` - Comma-separated IGT serials
- `ags_serials` - Comma-separated AGS serials
- `sg_assets` - Comma-separated SG assets
- `first_used` - First usage date
- `last_used` - Last usage date

**Usage:**
```sql
SELECT * FROM vw_work_order_serials;
```

## API Endpoints

Base URL: `serial-assignments/index.php`

### 1. Get All Consumed Serials
```
GET ?action=get_all_consumed_serials
```

**Parameters:**
- `source_table` - Filter by source table
- `search` - Search across all serial numbers and work orders
- `used_by` - Filter by user
- `wo_number` - Filter by work order/PO number
- `date_from` - Filter by date range (from)
- `date_to` - Filter by date range (to)
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 50)

**Response:**
```json
{
  "success": true,
  "data": [/* array of consumed serials */],
  "total": 100,
  "page": 1,
  "limit": 50,
  "total_pages": 2
}
```

### 2. Get Consumed Summary
```
GET ?action=get_consumed_summary
```

**Response:**
```json
{
  "success": true,
  "data": [/* summary by source table */]
}
```

### 3. Get Consumption Trend
```
GET ?action=get_consumption_trend
```

**Response:**
```json
{
  "success": true,
  "data": [/* daily consumption data for last 30 days */]
}
```

### 4. Get User Activity
```
GET ?action=get_user_activity
```

**Response:**
```json
{
  "success": true,
  "data": [/* user consumption activity */]
}
```

### 5. Get Work Order Serials
```
GET ?action=get_work_order_serials&work_order=40745
```

**Parameters:**
- `work_order` (optional) - Work order number to filter

**Response:**
```json
{
  "success": true,
  "data": [/* serials grouped by work order */]
}
```

## Angular Service Methods

File: `src/app/features/serial-assignments/services/serial-assignments.service.ts`

### 1. getAllConsumedSerials(filters?)
Get all consumed serials from all sources

```typescript
const result = await this.serialAssignmentsService.getAllConsumedSerials({
  search: '147207',
  page: 1,
  limit: 50
});
```

### 2. getConsumedSerialsSummary()
Get summary statistics

```typescript
const summary = await this.serialAssignmentsService.getConsumedSerialsSummary();
```

### 3. getDailyConsumptionTrend()
Get daily consumption trend

```typescript
const trend = await this.serialAssignmentsService.getDailyConsumptionTrend();
```

### 4. getUserConsumptionActivity()
Get user activity

```typescript
const activity = await this.serialAssignmentsService.getUserConsumptionActivity();
```

### 5. getWorkOrderSerials(workOrder?)
Get serials by work order

```typescript
const serials = await this.serialAssignmentsService.getWorkOrderSerials('40745');
```

## Implementation with AG Grid

The existing component `serial-assignments.component.ts` can be updated to use AG Grid for better performance and features.

### Key Features to Implement:

1. **Column Definitions** - Show all relevant fields
2. **Server-Side Pagination** - Handle large datasets
3. **Filtering** - Multi-column filtering
4. **Sorting** - Sort by any column
5. **Export** - Export to CSV/Excel
6. **Detail Views** - Expand row to see all details
7. **Search** - Global search across all fields
8. **Source Badges** - Color-coded badges for source tables

### Sample AG Grid Column Definitions:

```typescript
columnDefs = [
  { field: 'unique_id', headerName: 'ID', width: 100, pinned: 'left' },
  { 
    field: 'source_table', 
    headerName: 'Source', 
    width: 150,
    cellRenderer: (params) => {
      const badges = {
        'serial_assignments': '<span class="badge bg-primary">New System</span>',
        'ul_label_usages': '<span class="badge bg-info">UL Legacy</span>',
        'agsSerialGenerator': '<span class="badge bg-warning">AGS</span>',
        'sgAssetGenerator': '<span class="badge bg-success">SG</span>',
        'igt_serial_numbers': '<span class="badge bg-secondary">IGT</span>'
      };
      return badges[params.value] || params.value;
    }
  },
  { field: 'eyefi_serial_number', headerName: 'EyeFi Serial', width: 150 },
  { field: 'ul_number', headerName: 'UL Number', width: 150 },
  { field: 'igt_serial_number', headerName: 'IGT Serial', width: 150 },
  { field: 'ags_serial_number', headerName: 'AGS Serial', width: 150 },
  { field: 'sg_asset_number', headerName: 'SG Asset', width: 150 },
  { field: 'wo_number', headerName: 'Work Order', width: 120 },
  { field: 'po_number', headerName: 'PO Number', width: 120 },
  { 
    field: 'used_date', 
    headerName: 'Used Date', 
    width: 180,
    valueFormatter: (params) => new Date(params.value).toLocaleString()
  },
  { field: 'used_by', headerName: 'Used By', width: 150 },
  { field: 'status', headerName: 'Status', width: 120 },
  { field: 'property_site', headerName: 'Property', width: 150 },
  { field: 'inspector_name', headerName: 'Inspector', width: 150 },
  { field: 'customer_name', headerName: 'Customer', width: 150 }
];
```

## Benefits

1. **Unified View** - See all consumed serials in one place
2. **Complete History** - Access both new and legacy data
3. **Advanced Search** - Search across all serial types
4. **Analytics** - Built-in summary and trend views
5. **Work Order Tracking** - See all serials used in a WO
6. **User Activity** - Track user consumption patterns
7. **Performance** - Optimized queries with proper indexing
8. **Flexibility** - Easy to add new sources in the future

## Recommended Indexes

```sql
-- On serial_assignments
CREATE INDEX idx_sa_eyefi_serial_number ON serial_assignments(eyefi_serial_number);
CREATE INDEX idx_sa_wo_number ON serial_assignments(wo_number);
CREATE INDEX idx_sa_consumed_at ON serial_assignments(consumed_at);
CREATE INDEX idx_sa_consumed_by ON serial_assignments(consumed_by);

-- On ul_label_usages
CREATE INDEX idx_ulu_eyefi_serial ON ul_label_usages(eyefi_serial_number);
CREATE INDEX idx_ulu_wo_nbr ON ul_label_usages(wo_nbr);
CREATE INDEX idx_ulu_created_at ON ul_label_usages(created_at);

-- On agsSerialGenerator
CREATE INDEX idx_ags_serial_number ON agsSerialGenerator(serialNumber);
CREATE INDEX idx_ags_po_number ON agsSerialGenerator(poNumber);
CREATE INDEX idx_ags_timestamp ON agsSerialGenerator(timeStamp);

-- On sgAssetGenerator
CREATE INDEX idx_sg_serial_number ON sgAssetGenerator(serialNumber);
CREATE INDEX idx_sg_po_number ON sgAssetGenerator(poNumber);
CREATE INDEX idx_sg_timestamp ON sgAssetGenerator(timeStamp);

-- On igt_serial_numbers
CREATE INDEX idx_igt_serial_number ON igt_serial_numbers(serial_number);
CREATE INDEX idx_igt_status ON igt_serial_numbers(status);
CREATE INDEX idx_igt_used_at ON igt_serial_numbers(used_at);
```

## Next Steps

1. ✅ Create database views
2. ✅ Create API endpoints
3. ✅ Update Angular service
4. 🔲 Update component to use AG Grid
5. 🔲 Add export functionality
6. 🔲 Add detail view modals
7. 🔲 Add dashboard with charts
8. 🔲 Add real-time updates

## Files Created/Modified

- ✅ `database/views/vw_all_consumed_serials.sql` - Database views
- ✅ `backend/api/serial-assignments/index.php` - API endpoints
- ✅ `src/app/features/serial-assignments/services/serial-assignments.service.ts` - Service methods
- 📝 `src/app/features/serial-assignments/serial-assignments.component.ts` - Component (needs AG Grid update)
- 📝 `src/app/features/serial-assignments/serial-assignments.component.html` - Template (needs AG Grid update)
