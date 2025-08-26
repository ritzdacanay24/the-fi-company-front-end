# Inventory Alert System Implementation Guide

## Overview
This system provides automated email alerts when serial number inventory levels drop below specified thresholds. It includes both manual and automated checking capabilities.

## Files Created

### 1. `inventory-alerts.php`
Main API for managing inventory alerts with endpoints:
- `GET /check-inventory` - Check current levels and send alerts if needed
- `GET /send-test-alert` - Send test email to verify system
- `GET /get-alert-settings` - Get current threshold and recipient settings
- `POST /update-alert-settings` - Update alert configuration
- `GET /get-inventory-status` - Get current inventory status overview

### 2. `email-service.php`
Email handling service that supports:
- PHP mail() function (default)
- SMTP configuration (with PHPMailer integration ready)
- HTML and plain text email formats
- Bulk email sending with rate limiting
- Email validation

### 3. `inventory-scheduler.php`
Scheduled job runner for automatic checks:
- Command-line interface for cron jobs
- Web interface for manual triggering
- Configurable check frequency
- Comprehensive logging
- Log file cleanup

### 4. `create_inventory_alert_system.sql`
Database migration with:
- Alert logging table
- Configuration settings table
- Inventory status view
- Stored procedures for checking levels
- Optional event scheduler for automatic checks

## Configuration

### Email Settings
Update in `email-service.php`:
```php
private $fromEmail = 'noreply@yourcompany.com';
private $fromName = 'Inventory Management System';
```

### Alert Recipients
Update in `inventory-alerts.php`:
```php
private $alertRecipients = [
    'low_inventory' => [
        'manager@company.com',
        'inventory@company.com',
        'operations@company.com'
    ],
    'critical_inventory' => [
        'manager@company.com',
        'inventory@company.com', 
        'operations@company.com',
        'ceo@company.com'
    ]
];
```

### Thresholds
```php
private $lowInventoryThreshold = 10;     // Alert when available < 10
private $criticalInventoryThreshold = 5; // Critical when available < 5
```

## Setup Instructions

### 1. Database Setup
Run the migration script:
```sql
source backend/database/migrations/create_inventory_alert_system.sql
```

### 2. Test Email System
```bash
# Test from command line
php backend/api/IgtAssets/inventory-scheduler.php force-check

# Or via web browser
http://yoursite.com/backend/api/IgtAssets/inventory-alerts.php?path=send-test-alert
```

### 3. Setup Automated Checking
Add to crontab for hourly checks:
```bash
# Check inventory every hour
0 * * * * /usr/bin/php /path/to/backend/api/IgtAssets/inventory-scheduler.php check

# Clean logs weekly
0 0 * * 0 /usr/bin/php /path/to/backend/api/IgtAssets/inventory-scheduler.php clean-logs
```

### 4. SMTP Configuration (Optional)
For production environments, consider using SMTP:

1. Install PHPMailer:
```bash
composer require phpmailer/phpmailer
```

2. Update `email-service.php`:
```php
private $smtpEnabled = true;
private $smtpHost = 'smtp.gmail.com';
private $smtpUsername = 'your-email@gmail.com';
private $smtpPassword = 'your-app-password';
```

## API Usage Examples

### Check Inventory Levels
```javascript
fetch('/backend/api/IgtAssets/inventory-alerts.php?path=check-inventory')
  .then(response => response.json())
  .then(data => {
    console.log('Alerts:', data.alerts);
    console.log('Status:', data.inventory_stats);
  });
```

### Send Test Alert
```javascript
fetch('/backend/api/IgtAssets/inventory-alerts.php?path=send-test-alert')
  .then(response => response.json())
  .then(data => console.log('Test result:', data));
```

### Update Alert Settings
```javascript
fetch('/backend/api/IgtAssets/inventory-alerts.php?path=update-alert-settings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    low_threshold: 15,
    critical_threshold: 5,
    recipients: {
      low_inventory: ['manager@company.com'],
      critical_inventory: ['manager@company.com', 'ceo@company.com']
    }
  })
});
```

## Email Alert Features

### Alert Levels
- **Low Inventory**: When available count ≤ low threshold
- **Critical Inventory**: When available count ≤ critical threshold

### Email Content
- Professional HTML formatting
- Inventory statistics table
- Status indicators with color coding
- Recommended actions
- Direct link to inventory dashboard
- Plain text fallback for compatibility

### Recipient Management
- Different recipient lists for different alert levels
- Critical alerts go to additional stakeholders
- Configurable via API or direct code changes

## Monitoring and Logs

### Log Files
- `backend/logs/inventory-scheduler.log` - Scheduled job logs
- Alert history stored in `inventory_alert_log` table

### System Status
```bash
php backend/api/IgtAssets/inventory-scheduler.php status
```

### Manual Triggers
```bash
# Force immediate check
php backend/api/IgtAssets/inventory-scheduler.php force-check

# Check if scheduled run is due
php backend/api/IgtAssets/inventory-scheduler.php check
```

## Customization Options

### Email Templates
Modify `generateAlertEmailBody()` in `inventory-alerts.php` to customize:
- Company branding
- Email styling
- Content structure
- Additional information

### Alert Logic
Customize thresholds and conditions in:
- `checkInventoryLevels()` method
- Database view `inventory_status_view`
- Category-specific thresholds

### Integration Points
- Add webhook notifications
- Integrate with Slack/Teams
- Connect to external inventory systems
- Add SMS alerts for critical situations

## Troubleshooting

### Common Issues
1. **Emails not sending**: Check PHP mail configuration or SMTP settings
2. **Database errors**: Verify migration ran successfully
3. **Permission issues**: Ensure log directory is writable
4. **Cron not running**: Check crontab syntax and PHP path

### Debug Mode
Add debug logging by modifying the log level in scheduler:
```php
$this->log("Debug info: " . json_encode($data), 'DEBUG');
```

## Security Considerations

1. **Email validation**: All recipient emails are validated
2. **Input sanitization**: All API inputs are sanitized
3. **Error handling**: Sensitive information not exposed in errors
4. **Access control**: Consider adding authentication for API endpoints
5. **Log security**: Ensure log files are not web-accessible

## Performance Notes

- Email sending includes small delays to prevent server overload
- Database queries are optimized with indexes
- Log files are automatically cleaned up
- Configurable check frequency to balance timeliness vs. load

This system provides a robust foundation for inventory monitoring that can be extended based on specific business requirements.
