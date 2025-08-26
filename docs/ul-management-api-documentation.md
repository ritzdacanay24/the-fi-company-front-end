# UL Management System - Backend API Documentation

## Overview
This document outlines the required PHP API endpoints for the UL Management System. The backend should be implemented in the `/backend/api/ul-labels/` directory.

## Database Schema

### Table: `ul_labels`
```sql
CREATE TABLE ul_labels (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ul_number VARCHAR(50) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    manufacturer VARCHAR(255),
    part_number VARCHAR(100),
    certification_date DATE,
    expiry_date DATE,
    label_image_url VARCHAR(500),
    status ENUM('active', 'inactive', 'expired') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    INDEX idx_ul_number (ul_number),
    INDEX idx_status (status),
    INDEX idx_category (category)
);
```

### Table: `ul_label_usages`
```sql
CREATE TABLE ul_label_usages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ul_label_id INT NOT NULL,
    ul_number VARCHAR(50) NOT NULL,
    eyefi_serial_number VARCHAR(100) NOT NULL,
    quantity_used INT NOT NULL DEFAULT 1,
    date_used DATE NOT NULL,
    user_signature VARCHAR(255) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (ul_label_id) REFERENCES ul_labels(id) ON DELETE CASCADE,
    INDEX idx_ul_label_id (ul_label_id),
    INDEX idx_date_used (date_used),
    INDEX idx_customer (customer_name),
    INDEX idx_eyefi_serial (eyefi_serial_number)
);
```

## API Endpoints

### Base URL: `/backend/api/ul-labels/`

---

## UL Labels Management

### 1. Get All UL Labels
**GET** `/backend/api/ul-labels/index.php`

**Response:**
```json
{
    "success": true,
    "data": [
        {
            "id": 1,
            "ul_number": "E123456",
            "description": "Sample UL Label Description",
            "category": "Electronics",
            "manufacturer": "Sample Manufacturer",
            "part_number": "PN-001",
            "certification_date": "2024-01-01",
            "expiry_date": "2026-01-01",
            "label_image_url": null,
            "status": "active",
            "created_at": "2024-08-20 10:00:00",
            "updated_at": "2024-08-20 10:00:00",
            "created_by": 1
        }
    ],
    "message": "UL Labels retrieved successfully"
}
```

### 2. Get UL Label by ID
**GET** `/backend/api/ul-labels/index.php?id={id}`

### 3. Create UL Label
**POST** `/backend/api/ul-labels/index.php`

**Request Body:**
```json
{
    "ul_number": "E123456",
    "description": "Sample UL Label Description",
    "category": "Electronics",
    "manufacturer": "Sample Manufacturer",
    "part_number": "PN-001",
    "certification_date": "2024-01-01",
    "expiry_date": "2026-01-01",
    "status": "active"
}
```

### 4. Update UL Label
**PUT** `/backend/api/ul-labels/index.php?id={id}`

### 5. Delete UL Label
**DELETE** `/backend/api/ul-labels/index.php?id={id}`

### 6. Bulk Upload UL Labels
**POST** `/backend/api/ul-labels/bulk-upload.php`

**Form Data:**
- `file`: CSV or Excel file with UL label data

**CSV Format:**
```csv
ul_number,description,category,manufacturer,part_number,certification_date,expiry_date,status
E123456,Sample UL Label,Electronics,Sample Manufacturer,PN-001,2024-01-01,2026-01-01,active
```

**Response:**
```json
{
    "success": true,
    "data": {
        "uploaded_count": 5,
        "errors": [
            {
                "row": 3,
                "message": "UL Number already exists"
            }
        ]
    },
    "message": "Bulk upload completed"
}
```

### 7. Search UL Labels
**GET** `/backend/api/ul-labels/search.php?search={query}`

### 8. Get UL Numbers List
**GET** `/backend/api/ul-labels/ul-numbers.php`

**Response:**
```json
{
    "success": true,
    "data": ["E123456", "E789012", "E345678"],
    "message": "UL Numbers retrieved successfully"
}
```

### 9. Validate UL Number
**GET** `/backend/api/ul-labels/validate.php?ul_number={ul_number}`

**Response:**
```json
{
    "success": true,
    "data": {
        "id": 1,
        "ul_number": "E123456",
        "description": "Sample UL Label Description",
        "status": "active"
    },
    "message": "UL Number is valid"
}
```

### 10. Update UL Label Status
**PATCH** `/backend/api/ul-labels/status.php?id={id}`

**Request Body:**
```json
{
    "status": "expired"
}
```

### 11. Upload Label Image
**POST** `/backend/api/ul-labels/upload-image.php?id={id}`

**Form Data:**
- `image`: Image file (JPG, PNG, PDF)

---

## UL Label Usage Tracking

### 12. Record UL Label Usage
**POST** `/backend/api/ul-labels/usage.php`

**Request Body:**
```json
{
    "ul_label_id": 1,
    "ul_number": "E123456",
    "eyefi_serial_number": "SN-20240820-1234",
    "quantity_used": 2,
    "date_used": "2024-08-20",
    "user_signature": "JOHN-123456",
    "user_name": "John Doe",
    "customer_name": "ABC Corp",
    "notes": "Used for production batch #123"
}
```

### 13. Get All UL Label Usages
**GET** `/backend/api/ul-labels/usage.php`

### 14. Get UL Label Usage History
**GET** `/backend/api/ul-labels/usage-history.php?ul_label_id={id}`

### 15. Update UL Label Usage
**PUT** `/backend/api/ul-labels/usage.php?id={id}`

### 16. Delete UL Label Usage
**DELETE** `/backend/api/ul-labels/usage.php?id={id}`

---

## Reporting

### 17. UL Labels Report
**GET** `/backend/api/ul-labels/reports/labels.php?start_date={date}&end_date={date}`

**Response:**
```json
{
    "success": true,
    "data": [
        {
            "ul_number": "E123456",
            "description": "Sample UL Label",
            "total_quantity_used": 25,
            "last_used_date": "2024-08-20",
            "usage_count": 5,
            "status": "active"
        }
    ],
    "message": "UL Labels report generated successfully"
}
```

### 18. UL Usage Report
**GET** `/backend/api/ul-labels/reports/usage.php?start_date={date}&end_date={date}&customer_name={name}`

**Response:**
```json
{
    "success": true,
    "data": [
        {
            "id": 1,
            "ul_number": "E123456",
            "description": "Sample UL Label",
            "eyefi_serial_number": "SN-20240820-1234",
            "quantity_used": 2,
            "date_used": "2024-08-20",
            "user_name": "John Doe",
            "customer_name": "ABC Corp",
            "notes": "Used for production batch #123"
        }
    ],
    "message": "Usage report generated successfully"
}
```

---

## Export Endpoints

### 19. Export UL Labels
**GET** `/backend/api/ul-labels/export.php`

Returns Excel file with all UL labels data.

### 20. Export Usage Report
**GET** `/backend/api/ul-labels/reports/usage/export.php?start_date={date}&end_date={date}`

Returns Excel file with usage report data.

---

## Error Responses

All endpoints should return consistent error responses:

```json
{
    "success": false,
    "error": "ERROR_CODE",
    "message": "Human readable error message",
    "details": "Additional error details if needed"
}
```

## Common Error Codes:
- `INVALID_REQUEST`: Missing or invalid request parameters
- `NOT_FOUND`: Resource not found
- `DUPLICATE_ENTRY`: Attempting to create duplicate UL number
- `VALIDATION_ERROR`: Data validation failed
- `DATABASE_ERROR`: Database operation failed
- `FILE_UPLOAD_ERROR`: File upload failed
- `PERMISSION_DENIED`: User lacks required permissions

## Authentication
All endpoints should validate user authentication using the existing authentication system. Include `created_by` and `updated_by` fields using the authenticated user's ID.

## File Structure
```
/backend/api/ul-labels/
├── index.php (CRUD operations)
├── bulk-upload.php
├── search.php
├── ul-numbers.php
├── validate.php
├── status.php
├── upload-image.php
├── usage.php (usage CRUD)
├── usage-history.php
├── export.php
└── reports/
    ├── labels.php
    └── usage/
        ├── index.php
        └── export.php
```

## Implementation Notes
1. Use prepared statements for all database queries
2. Implement proper input validation and sanitization
3. Return consistent JSON responses
4. Log all significant operations
5. Implement proper error handling
6. Use transactions for bulk operations
7. Include pagination for large datasets
8. Implement proper file upload security for images and CSV files
