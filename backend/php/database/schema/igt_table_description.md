# IGT Records Table Schema

## Table: `igt_records`

This table stores Interactive Gaming Technology (IGT) asset records for quality control and compliance tracking.

### Columns

| Column | Type | Description |
|--------|------|-------------|
| `id` | int(11) AUTO_INCREMENT | Primary key |
| `generated_IGT_asset` | varchar(255) | Auto-generated IGT asset number (unique) |
| `serialNumber` | varchar(255) | Device serial number |
| `igtPartNumber` | varchar(255) | Customer IGT part number |
| `eyefiPartNumber` | varchar(255) | Internal Eyefi part number |
| `woNumber` | varchar(255) | Work order number |
| `property_site` | varchar(255) | Casino/gaming facility location |
| `inspectorName` | varchar(255) | Quality control inspector name |
| `manualUpdate` | text | Notes and manual updates |
| `timeStamp` | datetime | Record creation timestamp |
| `lastUpdate` | datetime | Last modification timestamp |
| `active` | tinyint(1) | Record active status (1=active, 0=inactive) |
| `created_by` | int(11) | User ID who created the record |
| `updated_by` | int(11) | User ID who last updated the record |
| `created_at` | timestamp | Laravel-style created timestamp |
| `updated_at` | timestamp | Laravel-style updated timestamp |

### Indexes

- Primary key on `id`
- Unique index on `generated_IGT_asset`
- Indexes on frequently queried fields: `serialNumber`, `igtPartNumber`, `eyefiPartNumber`, `woNumber`, `property_site`, `active`, `created_by`, `created_at`

### Foreign Keys

- `created_by` references `users(id)`
- `updated_by` references `users(id)`

### Business Rules

1. `generated_IGT_asset` should be unique across all records
2. `active` defaults to 1 (active)
3. `timeStamp` and `lastUpdate` are automatically managed
4. `created_by` should be populated from the authenticated user
5. `inspectorName` is typically auto-populated from user information
