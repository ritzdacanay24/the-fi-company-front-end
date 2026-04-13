# Shipping Priorities API

This PHP API provides comprehensive CRUD operations for managing shipping order priorities.

## Base URL
```
/backend/api/shipping-priorities/
```

## Authentication
- The API uses CORS headers to allow cross-origin requests
- Authentication should be handled by your existing authentication system
- Pass user information in the request body for audit trails

## API Endpoints

### 1. Get All Active Priorities
**GET** `/backend/api/shipping-priorities/`

**Response:**
```json
{
    "success": true,
    "data": [
        {
            "id": 1,
            "order_id": "SO001234-1",
            "sales_order_number": "SO001234",
            "sales_order_line": "1",
            "priority_level": 1,
            "notes": "Rush order for important client",
            "created_at": "2025-09-03 10:00:00",
            "created_by": "admin",
            "updated_at": "2025-09-03 10:00:00",
            "updated_by": null,
            "is_active": true,
            "full_order_reference": "SO001234-1"
        }
    ],
    "count": 1
}
```

### 2. Get Priority by Order ID
**GET** `/backend/api/shipping-priorities/?order_id=SO001234-1`

**Response:**
```json
{
    "success": true,
    "data": {
        "id": 1,
        "order_id": "SO001234-1",
        "sales_order_number": "SO001234",
        "sales_order_line": "1",
        "priority_level": 1,
        "notes": "Rush order for important client",
        "created_at": "2025-09-03 10:00:00",
        "created_by": "admin",
        "updated_at": "2025-09-03 10:00:00",
        "updated_by": null,
        "is_active": true
    }
}
```

### 3. Add New Priority
**POST** `/backend/api/shipping-priorities/`

**Request Body:**
```json
{
    "order_id": "SO001234-1",
    "sales_order_number": "SO001234",
    "sales_order_line": "1",
    "priority_level": 1,
    "notes": "Rush order for important client",
    "created_by": "admin"
}
```

**Response:**
```json
{
    "success": true,
    "message": "Priority added successfully",
    "id": 1
}
```

### 4. Update Priority
**PUT** `/backend/api/shipping-priorities/?id=1`

**Request Body:**
```json
{
    "priority_level": 2,
    "notes": "Updated notes",
    "updated_by": "admin"
}
```

**Response:**
```json
{
    "success": true,
    "message": "Priority updated successfully"
}
```

### 5. Remove Priority (Soft Delete)
**DELETE** `/backend/api/shipping-priorities/?id=1&updated_by=admin`

**Response:**
```json
{
    "success": true,
    "message": "Priority removed successfully"
}
```

### 6. Reorder Priorities (Bulk Update)
**POST** `/backend/api/shipping-priorities/?action=reorder`

**Request Body:**
```json
{
    "priorities": [
        {"id": 1, "priority_level": 2},
        {"id": 2, "priority_level": 1},
        {"id": 3, "priority_level": 3}
    ],
    "updated_by": "admin"
}
```

**Response:**
```json
{
    "success": true,
    "message": "Priorities reordered successfully"
}
```

## Error Handling

All endpoints return consistent error responses:

```json
{
    "success": false,
    "error": "Error message description"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad Request (validation errors)
- `405` - Method Not Allowed
- `500` - Internal Server Error

## Database Requirements

1. **Table:** `shipping_priorities` (created by the migration script)
2. **View:** `active_shipping_priorities` (created by the migration script)
3. **Triggers:** Business rule enforcement (created by the migration script)

## Installation

1. Copy `index.php` to your PHP server at `/backend/api/shipping-priorities/`
2. Ensure the database configuration is properly set up in `../../config/database.php`
3. Run the database migration script to create the required tables and triggers
4. Test the API endpoints using your preferred HTTP client

## Frontend Integration

This API is designed to work seamlessly with the Angular frontend's mock service. Simply update the service URLs to point to this PHP API instead of the mock implementation.

Example Angular service update:
```typescript
// Change from mock to real API
private baseUrl = 'http://your-server.com/backend/api/shipping-priorities';

updateShippingPriority(orderId: string, priorityLevel: number): Promise<any> {
    return this.http.put(`${this.baseUrl}?id=${orderId}`, {
        priority_level: priorityLevel,
        updated_by: this.getCurrentUser()
    }).toPromise();
}
```

## Security Considerations

1. **Input Validation:** All inputs are validated and sanitized
2. **SQL Injection Protection:** Uses prepared statements
3. **Transaction Safety:** Bulk operations use database transactions
4. **Audit Trail:** Tracks who created/updated each priority
5. **Soft Deletes:** Maintains data integrity with soft deletes

## Performance Features

1. **Database Indexes:** Optimized for common queries
2. **View Usage:** Uses pre-built view for active priorities
3. **Transaction Control:** Bulk operations are atomic
4. **Error Handling:** Graceful error handling with rollback support
