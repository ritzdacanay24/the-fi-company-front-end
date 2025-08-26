# Serial Number Generator Database Documentation

## Overview
The Serial Number Generator database system provides comprehensive tracking and management of serial numbers across the application. It supports configurable templates, batch generation, audit trails, and usage tracking.

## Database Schema

### Tables

#### 1. `serial_number_templates`
Stores reusable serial number format configurations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT AUTO_INCREMENT | Primary key |
| `template_id` | VARCHAR(50) | Unique template identifier |
| `name` | VARCHAR(100) | Human-readable template name |
| `description` | TEXT | Template description |
| `config` | JSON | Template configuration (format, prefixes, etc.) |
| `is_default` | BOOLEAN | Whether this is a default template |
| `is_active` | BOOLEAN | Whether template is active |
| `created_by` | INT | User ID who created the template |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_by` | INT | User ID who last updated |
| `updated_at` | TIMESTAMP | Last update timestamp |

**Indexes:**
- `idx_template_id` on `template_id`
- `idx_name` on `name`
- `idx_created_by` on `created_by`
- `idx_is_active` on `is_active`

#### 2. `generated_serial_numbers`
Tracks all generated serial numbers and their usage.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT AUTO_INCREMENT | Primary key |
| `serial_number` | VARCHAR(255) | The actual serial number |
| `template_id` | VARCHAR(50) | Template used for generation |
| `config` | JSON | Configuration used at generation time |
| `used_for` | VARCHAR(100) | Purpose/context of the serial number |
| `reference_id` | VARCHAR(100) | ID of the item this serial is assigned to |
| `reference_table` | VARCHAR(50) | Table where this serial is used |
| `is_used` | BOOLEAN | Whether the serial number is in use |
| `generated_by` | INT | User ID who generated the serial |
| `generated_at` | TIMESTAMP | Generation timestamp |
| `used_at` | TIMESTAMP | When it was marked as used |
| `notes` | TEXT | Additional notes |

**Indexes:**
- `unique_serial` unique constraint on `serial_number`
- `idx_template_id` on `template_id`
- `idx_used_for` on `used_for`
- `idx_reference` on `reference_table, reference_id`
- `idx_generated_by` on `generated_by`
- `idx_generated_at` on `generated_at`

#### 3. `serial_number_sequences`
Manages sequential number generation with counters.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT AUTO_INCREMENT | Primary key |
| `sequence_name` | VARCHAR(100) | Unique sequence identifier |
| `prefix` | VARCHAR(50) | Sequence prefix |
| `current_value` | BIGINT | Current sequence value |
| `increment_by` | INT | Increment step |
| `min_value` | BIGINT | Minimum allowed value |
| `max_value` | BIGINT | Maximum allowed value |
| `format_template` | VARCHAR(255) | Format template for the sequence |
| `is_active` | BOOLEAN | Whether sequence is active |
| `created_by` | INT | User ID who created |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_by` | INT | User ID who last updated |
| `updated_at` | TIMESTAMP | Last update timestamp |

#### 4. `serial_number_audit`
Comprehensive audit trail for all serial number operations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT AUTO_INCREMENT | Primary key |
| `operation_type` | ENUM | Type of operation (GENERATE, USE, RESERVE, etc.) |
| `serial_number` | VARCHAR(255) | Serial number involved |
| `template_id` | VARCHAR(50) | Template used |
| `reference_table` | VARCHAR(50) | Related table |
| `reference_id` | VARCHAR(100) | Related record ID |
| `old_data` | JSON | Previous state data |
| `new_data` | JSON | New state data |
| `performed_by` | INT | User who performed the operation |
| `performed_at` | TIMESTAMP | When operation occurred |
| `ip_address` | VARCHAR(45) | IP address of user |
| `user_agent` | TEXT | Browser/client information |
| `notes` | TEXT | Additional notes |

#### 5. `serial_number_batches`
Tracks batch generation operations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT AUTO_INCREMENT | Primary key |
| `batch_id` | VARCHAR(50) | Unique batch identifier |
| `template_id` | VARCHAR(50) | Template used for batch |
| `config` | JSON | Configuration used |
| `total_count` | INT | Total numbers to generate |
| `generated_count` | INT | Numbers actually generated |
| `used_count` | INT | Numbers marked as used |
| `status` | ENUM | Batch status (GENERATING, COMPLETED, CANCELLED) |
| `purpose` | VARCHAR(255) | Purpose of the batch |
| `notes` | TEXT | Additional notes |
| `created_by` | INT | User who created the batch |
| `created_at` | TIMESTAMP | Creation timestamp |
| `completed_at` | TIMESTAMP | Completion timestamp |

#### 6. `batch_serial_numbers`
Junction table linking batches to individual serial numbers.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT AUTO_INCREMENT | Primary key |
| `batch_id` | VARCHAR(50) | Batch identifier |
| `serial_number_id` | BIGINT | Generated serial number ID |
| `sequence_in_batch` | INT | Position in batch |
| `created_at` | TIMESTAMP | Creation timestamp |

## Views

### 1. `v_serial_number_templates`
Enhanced template view with usage statistics.

### 2. `v_generated_serial_numbers`
Serial numbers with template information and status.

### 3. `v_serial_number_batches`
Batch information with progress calculations.

### 4. `v_serial_number_audit`
User-friendly audit trail view.

### 5. `v_serial_number_sequences`
Sequence status with usage percentages.

### 6. `v_daily_serial_stats`
Daily generation statistics (last 30 days).

### 7. `v_monthly_serial_stats`
Monthly generation statistics (last 12 months).

### 8. `v_unused_serial_numbers`
Unused serial numbers with age categorization.

## Stored Procedures

### 1. `GenerateSerialNumber`
Generates a single serial number using a template.

**Parameters:**
- `p_template_id` - Template to use
- `p_used_for` - Purpose/context
- `p_reference_id` - Related record ID
- `p_reference_table` - Related table
- `p_generated_by` - User ID
- `p_serial_number` (OUT) - Generated serial number

### 2. `UseSerialNumber`
Marks a serial number as used.

**Parameters:**
- `p_serial_number` - Serial number to mark as used
- `p_reference_id` - Related record ID
- `p_reference_table` - Related table
- `p_used_by` - User ID
- `p_notes` - Optional notes

### 3. `GetNextSequenceValue`
Gets the next value from a sequence.

**Parameters:**
- `p_sequence_name` - Sequence name
- `p_next_value` (OUT) - Next sequence value

### 4. `CreateSerialNumberBatch`
Creates a batch generation record.

**Parameters:**
- `p_batch_id` - Unique batch identifier
- `p_template_id` - Template to use
- `p_total_count` - Number of serials to generate
- `p_purpose` - Purpose of the batch
- `p_created_by` - User ID

### 5. `CheckSerialNumberUniqueness`
Checks if a serial number is unique.

**Parameters:**
- `p_serial_number` - Serial number to check
- `p_is_unique` (OUT) - Boolean result

## Functions

### 1. `ValidateSerialNumberFormat`
Validates serial number format against a pattern.

**Parameters:**
- `p_serial_number` - Serial number to validate
- `p_pattern` - Validation pattern
**Returns:** BOOLEAN

## Installation

1. **Create Tables:**
   ```sql
   SOURCE database/migrations/create_serial_number_tables.sql;
   ```

2. **Insert Default Data:**
   ```sql
   SOURCE database/migrations/insert_default_serial_templates.sql;
   ```

3. **Create Stored Procedures:**
   ```sql
   SOURCE database/stored-procedures/serial_number_procedures.sql;
   ```

4. **Create Views:**
   ```sql
   SOURCE database/views/serial_number_views.sql;
   ```

## Usage Examples

### Generate a Serial Number
```sql
CALL GenerateSerialNumber('standard-product', 'product', 'PROD123', 'products', 1, @serial);
SELECT @serial;
```

### Mark Serial as Used
```sql
CALL UseSerialNumber('SN-20250819-1234', 'ASSET001', 'assets', 1, 'Assigned to equipment');
```

### Get Template Usage Statistics
```sql
SELECT * FROM v_serial_number_templates WHERE template_id = 'standard-product';
```

### Check Daily Statistics
```sql
SELECT * FROM v_daily_serial_stats WHERE generation_date >= CURDATE() - INTERVAL 7 DAY;
```

## Configuration JSON Format

Templates store their configuration in JSON format:

```json
{
  "prefix": "SN",
  "includeDate": true,
  "includeTime": false,
  "dateFormat": "YYYYMMDD",
  "timeFormat": "HHmmss",
  "includeRandomNumbers": true,
  "randomNumberLength": 4,
  "separator": "-",
  "suffix": "",
  "customFormat": "PROD-{DATE:YYYYMMDD}-{RANDOM:4}"
}
```

## Security Considerations

1. **User Authentication:** All operations should include user identification
2. **Audit Trail:** All changes are logged in the audit table
3. **IP Tracking:** IP addresses are recorded for security
4. **Access Control:** Implement proper access controls for template management

## Performance Considerations

1. **Indexes:** Comprehensive indexes on frequently queried columns
2. **Partitioning:** Consider partitioning large tables by date
3. **Archiving:** Implement archiving strategy for old audit records
4. **Caching:** Cache frequently used templates in application layer

## Backup and Maintenance

1. **Regular Backups:** Ensure regular database backups
2. **Index Maintenance:** Monitor and maintain indexes
3. **Statistics Update:** Keep table statistics current
4. **Cleanup:** Implement cleanup procedures for old audit data

## API Integration

The database integrates with the REST API at `/backend/api/serial-number/index.php` which provides:

- Serial number generation
- Batch generation
- Template management
- Usage tracking
- Validation
- History retrieval

## Monitoring

Monitor the following metrics:
- Serial number generation rates
- Template usage patterns
- Unique constraint violations
- Sequence exhaustion
- Batch completion rates
- Audit log growth
