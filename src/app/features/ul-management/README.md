# UL Management System

## Overview
The UL (Underwriters Laboratories) Management System is a comprehensive solution for managing UL labels, tracking their usage, and generating detailed reports. This system helps organizations maintain compliance with UL certification requirements and track label usage across different projects and customers.

## Features

### 📊 Dashboard
- Real-time statistics and metrics
- Recent activity monitoring
- Expiring labels alerts
- Usage trends visualization

### 🏷️ UL Label Management
- Add, edit, and delete UL labels
- Bulk upload via CSV/Excel
- Search and filter capabilities
- Status management (active, inactive, expired)
- Expiration date tracking

### 📋 Usage Tracking
- Record UL label usage with detailed information
- Track Eyefi serial numbers
- Customer and user information
- Quantity tracking
- Digital signatures

### 📈 Reporting
- Comprehensive UL labels reports
- Usage reports with filtering
- Export capabilities
- Summary statistics
- Top customers and products analysis

## Quick Start

### 1. Database Setup
Run the migration script to create the required tables:
```sql
-- Execute the migration file
source database/migrations/create_ul_management_tables.sql
```

### 2. Backend API
The PHP API endpoints are located in `/backend/api/ul-labels/`:
- Main CRUD operations: `index.php`
- Usage tracking: `usage.php`
- UL numbers list: `ul-numbers.php`
- Validation: `validate.php`
- Reports: `reports/`

### 3. Frontend Access
Navigate to the UL Management section in the application:
```
/dashboard/ul-management
```

## Navigation Structure

```
UL Management
├── Dashboard (Overview and statistics)
├── Upload Labels (Single and bulk upload)
├── Labels Report (View and manage all labels)
├── Record Usage (Track label usage)
└── Usage Report (View usage history and statistics)
```

## Key Components

### Models
- **ULLabel**: Core label information and metadata
- **ULLabelUsage**: Usage tracking records
- **ULLabelReport**: Report data structures
- **ULUsageReport**: Usage report structures

### Services
- **ULLabelService**: Main service for all API operations
  - CRUD operations for labels and usage
  - Bulk upload functionality
  - Search and validation
  - Report generation

### Components
- **ULManagementComponent**: Main dashboard
- **ULLabelUploadComponent**: Upload interface
- **ULLabelsReportComponent**: Labels management grid
- **ULLabelUsageComponent**: Usage recording form
- **ULUsageReportComponent**: Usage reporting interface

## API Endpoints

### UL Labels
- `GET /backend/api/ul-labels/index.php` - Get all labels
- `POST /backend/api/ul-labels/index.php` - Create new label
- `PUT /backend/api/ul-labels/index.php?id={id}` - Update label
- `DELETE /backend/api/ul-labels/index.php?id={id}` - Delete label

### Usage Tracking
- `GET /backend/api/ul-labels/usage.php` - Get usage records
- `POST /backend/api/ul-labels/usage.php` - Record new usage

### Utilities
- `GET /backend/api/ul-labels/ul-numbers.php` - Get UL numbers list
- `GET /backend/api/ul-labels/validate.php?ul_number={number}` - Validate UL number
- `GET /backend/api/ul-labels/dashboard-stats.php` - Dashboard statistics

### Reports
- `GET /backend/api/ul-labels/reports/labels.php` - Labels report
- `GET /backend/api/ul-labels/reports/usage/index.php` - Usage report

## Data Flow

### 1. Label Management
```
Upload → Validation → Database Storage → Reports
```

### 2. Usage Tracking
```
Select UL Number → Validate → Record Usage → Update Statistics
```

### 3. Reporting
```
Filter Criteria → Query Database → Generate Report → Export Options
```

## Database Schema

### ul_labels
- Stores UL label information
- Tracks status and expiration dates
- Links to usage records

### ul_label_usages
- Records each usage instance
- Links to UL labels
- Tracks customer and user information

### Views
- `vw_ul_labels_report`: Aggregated label data with usage statistics
- `vw_ul_usage_report`: Detailed usage reporting view
- `vw_ul_dashboard_stats`: Dashboard statistics view

## Security Features

- Input validation and sanitization
- Prepared SQL statements
- CORS configuration
- Error handling and logging
- User authentication integration

## File Upload Support

### Supported Formats
- **CSV**: Comma-separated values
- **Excel**: .xlsx files
- **Images**: JPG, PNG, PDF for label images

### CSV Template
```csv
ul_number,description,category,manufacturer,part_number,certification_date,expiry_date,status
E123456,Sample UL Label,Electronics,Sample Manufacturer,PN-001,2024-01-01,2026-01-01,active
```

## Reporting Features

### Label Reports
- Status distribution
- Expiration tracking
- Usage statistics
- Category analysis

### Usage Reports
- Time-based filtering
- Customer analysis
- User activity tracking
- Quantity summaries

## Development Notes

### Technology Stack
- **Frontend**: Angular 15+, NgBootstrap, AG Grid
- **Backend**: PHP with MySQLi
- **Database**: MySQL 8.0+
- **Styling**: Bootstrap 5, Custom SCSS

### Code Organization
```
src/app/features/ul-management/
├── components/       # Reusable components
├── models/          # Data interfaces
├── pages/           # Page components
├── services/        # API services
└── ul-management.module.ts
```

## Maintenance

### Regular Tasks
1. Monitor expiring labels
2. Review usage patterns
3. Clean up old records
4. Update label information
5. Generate compliance reports

### Database Maintenance
```sql
-- Check for expiring labels
SELECT * FROM ul_labels 
WHERE expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY);

-- Usage statistics
SELECT COUNT(*) as total_usage 
FROM ul_label_usages 
WHERE date_used >= DATE_SUB(CURDATE(), INTERVAL 30 DAY);
```

## Troubleshooting

### Common Issues
1. **Database Connection**: Check database configuration
2. **File Upload**: Verify file permissions and size limits
3. **API Errors**: Check error logs and response codes
4. **Performance**: Monitor query execution and optimize indexes

### Support
For technical support or feature requests, refer to the API documentation:
- `docs/ul-management-api-documentation.md`

## Future Enhancements

### Planned Features
- Barcode generation for UL numbers
- Advanced analytics dashboard
- Email notifications for expiring labels
- Integration with inventory systems
- Mobile app support
- Audit trail functionality

---

*Last Updated: August 2024*
