# Material Request API

## Overview
This API provides endpoints for managing material requests in the Kanban workflow system.

## Base URL
`/igt_api/operations/material-request/`

## Endpoints

### GET /getAllWithStatus
Gets all material requests with their current status for the Kanban board.

**Response:**
```json
[
  {
    "id": 1,
    "requestor": "John Doe",
    "lineNumber": "MR-000001",
    "dueDate": "2024-01-15",
    "priority": "normal",
    "status": "new",
    "age_days": 5,
    "item_count": 3,
    "validated_items": 0,
    "rejected_items": 0,
    "pending_reviews": 0,
    "completed_reviews": 0
  }
]
```

### PUT /updateStatus/{id}
Updates the status of a material request.

**Parameters:**
- `id` (path): The ID of the material request

**Request Body:**
```json
{
  "status": "approved",
  "updatedBy": 123
}
```

**Valid Status Values:**
- `new`: New requests awaiting validation
- `under_validation`: Being reviewed by supervisors/managers
- `pending_review`: Awaiting department/specialist reviews
- `approved`: Validated and ready for inventory picking
- `picking`: Currently being picked from inventory
- `complete`: Fully processed and delivered
- `cancelled`: Request cancelled or rejected

**Response:**
```json
{
  "success": true,
  "message": "Status updated successfully",
  "data": {
    "id": 1,
    "queue_status": "approved",
    "modifiedDate": "2024-01-15 10:30:00"
  }
}
```

## Database Schema

### Main Table: `mrf`
- `id`: Primary key
- `queue_status`: ENUM status field
- `modifiedDate`: Last modification timestamp
- `modifiedBy`: User ID who made the change

### Audit Table: `mrf_status_audit_log`
- `id`: Primary key
- `mrf_id`: Foreign key to mrf table
- `old_status`: Previous status
- `new_status`: New status
- `changed_by`: User ID who made the change
- `changed_date`: When the change was made

## Error Handling

### 400 Bad Request
- Invalid status value
- Missing required fields

### 404 Not Found
- Endpoint not found
- Request ID not found

### 500 Internal Server Error
- Database connection issues
- SQL execution errors

## Migration Files

To set up the database schema:

1. Run `add_queue_status_to_mrf.sql` to add the queue_status field
2. Run `create_mrf_status_audit_log_table.sql` to create the audit log table

## Frontend Integration

The Material Request Kanban component uses this API via the `MaterialRequestService`:

```typescript
// Update request status
await this.materialRequestService.updateStatus(requestId, newStatus).toPromise();

// Get all requests with status
this.materialRequestService.getAllWithStatus().subscribe(data => {
  // Handle data
});
```

## Queue to Status Mapping

The Kanban component maps queue IDs to database status values:

```typescript
const queueToStatusMap = {
  'new': 'new',
  'validation': 'under_validation',
  'reviews': 'pending_review',
  'approved': 'approved',
  'picking': 'picking',
  'complete': 'complete'
};
```
