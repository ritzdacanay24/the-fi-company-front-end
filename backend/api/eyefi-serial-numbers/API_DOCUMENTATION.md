# EyeFi Serial Number Management API - Updated Structure

## API Endpoint Structure

All endpoints now use **query parameters** instead of separate files, following the same pattern as the UL Labels API.

### Base URL
```
https://dashboard.eye-fi.com/server/Api/eyefi-serial-numbers/index.php
```

## API Endpoints

### 1. Get All Serial Numbers (Default)
```
GET /eyefi-serial-numbers/index.php
GET /eyefi-serial-numbers/index.php?search=EYEFI-001
GET /eyefi-serial-numbers/index.php?status=available
```

**Query Parameters:**
- `search` - Search term for serial number, model, or customer
- `status` - Filter by status (available, assigned, shipped, returned, defective)
- `product_model` - Filter by product model
- `batch_number` - Filter by batch number
- `date_from` - Filter from date
- `date_to` - Filter to date
- `sort_by` - Sort field (default: created_at)
- `sort_order` - Sort direction (ASC/DESC, default: DESC)
- `limit` - Limit results
- `offset` - Offset for pagination

### 2. Get Statistics
```
GET /eyefi-serial-numbers/index.php?action=statistics
```

Returns overall statistics, model distribution, and monthly trends.

### 3. Get Assignments
```
GET /eyefi-serial-numbers/index.php?action=assignments
GET /eyefi-serial-numbers/index.php?action=assignments&serial_number=EYEFI-001
GET /eyefi-serial-numbers/index.php?action=assignments&customer_name=Acme
```

**Query Parameters:**
- `serial_number` - Filter by specific serial number
- `customer_name` - Filter by customer name (partial match)
- `work_order_number` - Filter by work order number
- `limit` - Limit results

### 4. Export to CSV
```
GET /eyefi-serial-numbers/index.php?action=export
GET /eyefi-serial-numbers/index.php?action=export&serial_numbers=EYEFI-001,EYEFI-002
```

**Query Parameters:**
- `serial_numbers` - Comma-separated list of serial numbers to export (optional)

### 5. Bulk Upload Serial Numbers
```
POST /eyefi-serial-numbers/index.php?action=bulk-upload
```

**Request Body:**
```json
{
  "serialNumbers": [
    {
      "serial_number": "EYEFI-001",
      "product_model": "EyeFi Pro X1",
      "status": "available",
      "hardware_version": "1.2.0",
      "firmware_version": "2.1.4",
      "manufacture_date": "2024-10-01",
      "batch_number": "BATCH-2024-1001",
      "notes": "Test device"
    }
  ]
}
```

### 6. Assign Serial Numbers
```
POST /eyefi-serial-numbers/index.php?action=assign
```

**Request Body:**
```json
{
  "serial_numbers": ["EYEFI-001", "EYEFI-002"],
  "customer_name": "Acme Corp",
  "customer_po": "PO-12345",
  "work_order_number": "WO-67890",
  "wo_part": "PART-001",
  "wo_qty_ord": 10,
  "wo_due_date": "2024-12-31",
  "wo_description": "Production order",
  "assigned_date": "2024-10-13",
  "assigned_by_name": "John Doe",
  "notes": "Urgent order"
}
```

### 7. Update Serial Number Status
```
PUT /eyefi-serial-numbers/index.php
```

**Request Body:**
```json
{
  "serial_number": "EYEFI-001",
  "status": "shipped",
  "reason": "Shipped to customer" // Optional, required for 'defective' status
}
```

**Valid Statuses:**
- `available` - Ready for assignment
- `assigned` - Assigned to customer/work order
- `shipped` - Shipped to customer
- `returned` - Returned from customer
- `defective` - Marked as defective

## Response Format

### Success Response
```json
{
  "success": true,
  "data": [...],
  "message": "Operation successful",
  "count": 10
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message"
}
```

## Example Usage

### TypeScript/Angular Service

```typescript
// Get all serial numbers
getAllSerialNumbers(): Promise<any> {
  return firstValueFrom(this.http.get(`${this.API_URL}/index.php`));
}

// Get with filters
getAllSerialNumbers(filters?: any): Promise<any> {
  let params = new HttpParams();
  if (filters) {
    Object.keys(filters).forEach(key => {
      if (filters[key]) params = params.set(key, filters[key]);
    });
  }
  return firstValueFrom(this.http.get(`${this.API_URL}/index.php`, { params }));
}

// Get statistics
getStatistics(): Promise<any> {
  return firstValueFrom(this.http.get(`${this.API_URL}/index.php?action=statistics`));
}

// Get assignments
getAssignments(): Promise<any> {
  const params = new HttpParams().set('action', 'assignments');
  return firstValueFrom(this.http.get(`${this.API_URL}/index.php`, { params }));
}

// Bulk upload
bulkUpload(serialNumbers: any[]): Promise<any> {
  return firstValueFrom(
    this.http.post(`${this.API_URL}/index.php?action=bulk-upload`, { serialNumbers })
  );
}

// Assign serial numbers
assign(data: any): Promise<any> {
  return firstValueFrom(
    this.http.post(`${this.API_URL}/index.php?action=assign`, data)
  );
}

// Update status
updateStatus(serialNumber: string, status: string): Promise<any> {
  return firstValueFrom(
    this.http.put(`${this.API_URL}/index.php`, { serial_number: serialNumber, status })
  );
}
```

## Deployment

### Files to Deploy
Only **ONE** file needs to be deployed:
```
backend/api/eyefi-serial-numbers/index.php
```

### Database Requirements
Run the migration script to create required tables and views:
```bash
mysql -u root -p eyefidb < database/migrations/run_eyefi_serial_setup.sql
```

## Migration from Old Structure

### Old URLs → New URLs

| Old URL | New URL |
|---------|---------|
| `/eyefi-serial-numbers/bulk-upload` | `/eyefi-serial-numbers/index.php?action=bulk-upload` |
| `/eyefi-serial-numbers/statistics` | `/eyefi-serial-numbers/index.php?action=statistics` |
| `/eyefi-serial-numbers/assignments` | `/eyefi-serial-numbers/index.php?action=assignments` |
| `/eyefi-serial-numbers/assign` | `/eyefi-serial-numbers/index.php?action=assign` |
| `/eyefi-serial-numbers/export` | `/eyefi-serial-numbers/index.php?action=export` |

## Benefits of This Approach

1. **Single File Deployment** - Only one PHP file to maintain and deploy
2. **Consistent with Existing APIs** - Follows the same pattern as UL Labels API
3. **Easy to Extend** - Add new actions via query parameters
4. **No Routing Issues** - Works on any server configuration
5. **RESTful** - Still follows REST principles with proper HTTP methods

## Testing

Test the API endpoints using curl or Postman:

```bash
# Get all serial numbers
curl https://dashboard.eye-fi.com/server/Api/eyefi-serial-numbers/index.php

# Get statistics
curl https://dashboard.eye-fi.com/server/Api/eyefi-serial-numbers/index.php?action=statistics

# Bulk upload (POST)
curl -X POST https://dashboard.eye-fi.com/server/Api/eyefi-serial-numbers/index.php?action=bulk-upload \
  -H "Content-Type: application/json" \
  -d '{"serialNumbers":[{"serial_number":"TEST-001","product_model":"EyeFi Pro X1"}]}'
```
