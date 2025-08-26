# Photo Checklist Configuration Management System

This document describes the new configurable photo checklist system implemented for quality control processes.

## Overview

The new system provides a comprehensive configuration management solution for photo checklists, allowing administrators to create, modify, and manage checklist templates through a user-friendly interface.

## System Architecture

### Database Schema

The system uses five main tables:

1. **checklist_templates** - Template definitions
2. **checklist_items** - Individual checklist items within templates
3. **checklist_instances** - Active checklist instances for work orders
4. **photo_submissions** - Photo uploads for checklist items
5. **checklist_audit_log** - Audit trail for all actions
6. **checklist_config** - System configuration settings

### Key Features

- **Template Management**: Create reusable checklist templates
- **Drag & Drop Configuration**: Intuitive interface for organizing checklist items
- **Photo Requirements**: Specify detailed photo requirements (angle, distance, lighting, etc.)
- **Progress Tracking**: Real-time progress monitoring
- **Audit Trail**: Complete audit log of all actions
- **Configuration Management**: Centralized system settings
- **Legacy Compatibility**: Backwards compatible with existing system

## Usage

### 1. Creating Templates

Access the template manager at `/quality/template-manager`:

1. Click "New Template"
2. Fill in template information (name, description, part number, etc.)
3. Add checklist items using the "Add Item" button
4. Configure photo requirements for each item
5. Use drag & drop to reorder items
6. Save the template

### 2. Using Templates

When starting a new quality control checklist:

1. Enter work order number and part number
2. System automatically finds appropriate template
3. Creates new checklist instance
4. Guides user through photo requirements
5. Tracks progress automatically
6. Provides review interface before submission

### 3. Configuration Settings

System administrators can configure:

- Maximum photo file size
- Allowed photo/video formats
- Photo quality requirements
- Auto-submission settings
- Review requirements

## API Endpoints

### Template Management
- `GET /igt_api/photo-checklist-config.php?request=templates` - List all templates
- `GET /igt_api/photo-checklist-config.php?request=template&id={id}` - Get template details
- `POST /igt_api/photo-checklist-config.php?request=templates` - Create new template
- `PUT /igt_api/photo-checklist-config.php?request=template&id={id}` - Update template
- `DELETE /igt_api/photo-checklist-config.php?request=template&id={id}` - Delete template

### Instance Management
- `GET /igt_api/photo-checklist-config.php?request=instances` - List checklist instances
- `GET /igt_api/photo-checklist-config.php?request=instance&id={id}` - Get instance details
- `POST /igt_api/photo-checklist-config.php?request=instances` - Create new instance
- `PUT /igt_api/photo-checklist-config.php?request=instance&id={id}` - Update instance

### Photo Management
- `POST /igt_api/photo-checklist-config.php?request=photos` - Upload photo
- `DELETE /igt_api/photo-checklist-config.php?request=photo&id={id}` - Delete photo

### Configuration
- `GET /igt_api/photo-checklist-config.php?request=config` - Get all configuration
- `POST /igt_api/photo-checklist-config.php?request=config` - Update configuration

## Angular Services

### PhotoChecklistConfigService

Main service for interacting with the configuration system:

```typescript
// Get templates
this.configService.getTemplates().subscribe(templates => {
  // Handle templates
});

// Create instance from template
this.configService.createInstanceFromTemplate(
  templateId, 
  workOrderNumber, 
  partNumber, 
  serialNumber
).subscribe(result => {
  // Handle new instance
});

// Upload photo
this.configService.uploadPhoto(instanceId, itemId, file).subscribe(result => {
  // Handle upload result
});
```

## Migration from Legacy System

The system includes automatic fallback to the legacy API if the new system is not available:

1. New checklist requests first try the new configuration system
2. If no template is found, falls back to legacy system
3. Existing checklists continue to work normally
4. Gradual migration path allows testing and validation

## Installation

1. **Database Migration**: Run the SQL migration script:
   ```sql
   mysql -u [username] -p [database] < database/migrations/create_photo_checklist_tables.sql
   ```

2. **API Setup**: Deploy the new API file:
   ```
   igt_api/photo-checklist-config.php
   ```

3. **Angular Integration**: The new service is already integrated into the existing photo component

4. **Access Template Manager**: Navigate to `/quality/template-manager` (requires appropriate permissions)

## Configuration Examples

### Sample Template Creation

```json
{
  "name": "IGT Video Wall QC Checklist",
  "description": "Quality control checklist for IGT video walls",
  "part_number": "VWL-03513",
  "product_type": "Video Wall",
  "category": "quality_control",
  "items": [
    {
      "title": "Serial Tag and UL Label",
      "description": "Clear photo of serial tag, UL label, and main power switch",
      "is_required": true,
      "photo_requirements": {
        "angle": "front",
        "distance": "close",
        "lighting": "good",
        "focus": "serial_numbers"
      }
    }
  ]
}
```

### System Configuration

```json
{
  "max_photo_size_mb": 10,
  "allowed_photo_types": ["image/jpeg", "image/png", "image/webp"],
  "photo_compression_enabled": true,
  "photo_compression_quality": 85,
  "require_review_before_submit": true
}
```

## Benefits

1. **Flexibility**: Easy to create and modify checklists for different products
2. **Consistency**: Standardized photo requirements across all checklists
3. **Efficiency**: Reduced setup time for new product types
4. **Traceability**: Complete audit trail of all changes and actions
5. **Scalability**: System grows with business needs
6. **User Experience**: Intuitive drag-and-drop interface for configuration

## Support

For technical support or questions about the configuration system, contact the development team or refer to the API documentation in the codebase.
