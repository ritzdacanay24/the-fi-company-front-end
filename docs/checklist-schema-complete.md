# Photo Checklist System - Complete Schema Documentation

## Overview
This document provides the complete schema for the Photo Checklist Configuration Management System, including database tables, TypeScript interfaces, and data flow patterns.

**Last Updated:** November 10, 2025  
**Version:** 2.0 (with hierarchical support)

---

## Database Schema

### 1. `checklist_templates`
Main template definition for checklists.

```sql
CREATE TABLE IF NOT EXISTS checklist_templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    part_number VARCHAR(100),
    product_type VARCHAR(100),
    category ENUM('quality_control', 'installation', 'maintenance', 'inspection') DEFAULT 'quality_control',
    version VARCHAR(20) DEFAULT '1.0',
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_part_number (part_number),
    INDEX idx_product_type (product_type),
    INDEX idx_category (category),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Field Descriptions:**
- `id` - Unique identifier for the template
- `name` - Display name for the template
- `description` - Detailed description of what the template covers
- `part_number` - Associated part number (optional, can be 'GENERIC')
- `product_type` - Product classification
- `category` - Type of checklist (quality_control, installation, maintenance, inspection)
- `version` - Version string (auto-incremented on updates)
- `is_active` - Whether template is available for creating new instances
- `created_by` - User ID who created the template
- `created_at` - Creation timestamp
- `updated_at` - Last modification timestamp

---

### 2. `checklist_items`
Individual inspection items within a template. **Supports hierarchical structure (parent-child).**

```sql
CREATE TABLE IF NOT EXISTS checklist_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    template_id INT NOT NULL,
    order_index INT NOT NULL DEFAULT 0,
    parent_id INT NULL DEFAULT NULL,           -- For hierarchical items
    level TINYINT UNSIGNED NOT NULL DEFAULT 0, -- 0=parent, 1=child
    title VARCHAR(500) NOT NULL,
    description TEXT,
    photo_requirements JSON,
    sample_image_url VARCHAR(500),             -- Primary sample image URL
    sample_images JSON,                         -- Array of sample images (legacy/extended)
    is_required BOOLEAN DEFAULT TRUE,
    validation_rules JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (template_id) REFERENCES checklist_templates(id) ON DELETE CASCADE,
    INDEX idx_template_order (template_id, order_index),
    INDEX idx_parent (parent_id),
    INDEX idx_level (level),
    INDEX idx_required (is_required)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Field Descriptions:**
- `id` - Unique identifier for the item
- `template_id` - Reference to parent template
- `order_index` - Display order (supports decimals for hierarchy: 14, 14.1, 14.2, 15, 15.1, etc.)
- `parent_id` - References parent item's `order_index` (NULL for root items)
- `level` - Hierarchy level: 0 = parent/root, 1 = child/sub-item
- `title` - Item title/name
- `description` - Detailed instructions for this inspection item
- `photo_requirements` - JSON object defining photo capture requirements
- `sample_image_url` - Single primary sample image URL (preferred format)
- `sample_images` - JSON array of multiple sample images (legacy/extended support)
- `is_required` - Whether this item must be completed
- `validation_rules` - Additional validation rules (JSON)
- `created_at` - Creation timestamp
- `updated_at` - Last modification timestamp

**Hierarchical Structure Example:**
```
Item 14 (order_index=14, parent_id=NULL, level=0) - "Check connector alignment"
  └─ Item 14.1 (order_index=14.1, parent_id=14, level=1) - "Reference Photo 1"
  └─ Item 14.2 (order_index=14.2, parent_id=14, level=1) - "Reference Photo 2"
  └─ Item 14.3 (order_index=14.3, parent_id=14, level=1) - "Reference Photo 3"
Item 15 (order_index=15, parent_id=NULL, level=0) - "Verify power connections"
```

---

### 3. `checklist_instances`
Active checklist executions (work order specific).

```sql
CREATE TABLE IF NOT EXISTS checklist_instances (
    id INT PRIMARY KEY AUTO_INCREMENT,
    template_id INT NOT NULL,
    work_order_number VARCHAR(100) NOT NULL,
    part_number VARCHAR(100),
    serial_number VARCHAR(100),
    operator_id INT,
    operator_name VARCHAR(100),
    status ENUM('draft', 'in_progress', 'review', 'completed', 'submitted') DEFAULT 'draft',
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    submitted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (template_id) REFERENCES checklist_templates(id),
    INDEX idx_work_order (work_order_number),
    INDEX idx_serial_number (serial_number),
    INDEX idx_status (status),
    INDEX idx_operator (operator_id),
    INDEX idx_dates (created_at, completed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Field Descriptions:**
- `id` - Unique identifier for the instance
- `template_id` - Reference to checklist template
- `work_order_number` - Associated work order
- `part_number` - Part number being inspected
- `serial_number` - Serial number of the specific unit
- `operator_id` - User ID performing the inspection
- `operator_name` - Operator's name (cached)
- `status` - Current status of the checklist
  - `draft` - Created but not started
  - `in_progress` - Actively being filled out
  - `review` - Submitted for review
  - `completed` - Review completed, approved
  - `submitted` - Final submission
- `progress_percentage` - Calculated completion percentage (0-100)
- `started_at` - When work began
- `completed_at` - When all required items were completed
- `submitted_at` - Final submission timestamp
- `created_at` - Creation timestamp
- `updated_at` - Last modification timestamp

---

### 4. `photo_submissions`
Photos uploaded for checklist items.

```sql
CREATE TABLE IF NOT EXISTS photo_submissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    instance_id INT NOT NULL,
    item_id INT NOT NULL,
    file_name VARCHAR(255),
    file_path VARCHAR(500),
    file_url VARCHAR(500),
    file_type ENUM('image', 'video') DEFAULT 'image',
    file_size INT,
    mime_type VARCHAR(100),
    photo_metadata JSON,
    submission_notes TEXT,
    is_approved BOOLEAN NULL,
    reviewed_by INT NULL,
    reviewed_at TIMESTAMP NULL,
    review_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (instance_id) REFERENCES checklist_instances(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES checklist_items(id),
    INDEX idx_instance_item (instance_id, item_id),
    INDEX idx_file_type (file_type),
    INDEX idx_approval (is_approved),
    INDEX idx_review (reviewed_by, reviewed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Field Descriptions:**
- `id` - Unique identifier for the photo submission
- `instance_id` - Reference to checklist instance
- `item_id` - Reference to checklist item
- `file_name` - Original filename
- `file_path` - Server-side file path
- `file_url` - Public URL for accessing the photo
- `file_type` - Type of media (image or video)
- `file_size` - File size in bytes
- `mime_type` - MIME type of the file
- `photo_metadata` - JSON containing EXIF data, dimensions, etc.
- `submission_notes` - Optional notes from the operator
- `is_approved` - Approval status (NULL=pending, true=approved, false=rejected)
- `reviewed_by` - User ID who reviewed the photo
- `reviewed_at` - Review timestamp
- `review_notes` - Reviewer's comments
- `created_at` - Upload timestamp
- `updated_at` - Last modification timestamp

---

### 5. `checklist_audit_log`
Audit trail for all checklist actions.

```sql
CREATE TABLE IF NOT EXISTS checklist_audit_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    instance_id INT,
    action ENUM('created', 'started', 'photo_added', 'photo_removed', 'completed', 'submitted', 'reviewed') NOT NULL,
    user_id INT,
    user_name VARCHAR(100),
    details JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (instance_id) REFERENCES checklist_instances(id) ON DELETE CASCADE,
    INDEX idx_instance (instance_id),
    INDEX idx_action (action),
    INDEX idx_user (user_id),
    INDEX idx_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Field Descriptions:**
- `id` - Unique identifier for the log entry
- `instance_id` - Reference to checklist instance
- `action` - Type of action performed
- `user_id` - User who performed the action
- `user_name` - User's name (cached)
- `details` - Additional details in JSON format
- `ip_address` - IP address of the user
- `user_agent` - Browser/device information
- `created_at` - When the action occurred

---

### 6. `checklist_config`
System configuration settings.

```sql
CREATE TABLE IF NOT EXISTS checklist_config (
    id INT PRIMARY KEY AUTO_INCREMENT,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT,
    description TEXT,
    config_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_key (config_key),
    INDEX idx_type (config_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Default Configuration Values:**
```sql
INSERT INTO checklist_config (config_key, config_value, description, config_type) VALUES
('max_photo_size_mb', '10', 'Maximum photo file size in MB', 'number'),
('allowed_photo_types', '["image/jpeg", "image/png", "image/webp"]', 'Allowed photo MIME types', 'json'),
('allowed_video_types', '["video/mp4", "video/webm", "video/ogg"]', 'Allowed video MIME types', 'json'),
('photo_quality_min', '80', 'Minimum photo quality percentage', 'number'),
('auto_submit_on_complete', 'false', 'Auto-submit checklist when all photos are taken', 'boolean'),
('require_review_before_submit', 'true', 'Require review step before final submission', 'boolean'),
('photo_compression_enabled', 'true', 'Enable automatic photo compression', 'boolean'),
('photo_compression_quality', '85', 'Photo compression quality (1-100)', 'number');
```

---

### 7. `checklist_upload_log`
Track sample image uploads for checklist items.

```sql
CREATE TABLE IF NOT EXISTS checklist_upload_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    item_id INT NULL,
    template_id INT NULL,
    file_name VARCHAR(255),
    file_path VARCHAR(500),
    file_url VARCHAR(500),
    file_size INT,
    mime_type VARCHAR(100),
    upload_type ENUM('sample_image', 'submission_photo') DEFAULT 'sample_image',
    uploaded_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (item_id) REFERENCES checklist_items(id) ON DELETE SET NULL,
    FOREIGN KEY (template_id) REFERENCES checklist_templates(id) ON DELETE SET NULL,
    INDEX idx_item (item_id),
    INDEX idx_template (template_id),
    INDEX idx_upload_type (upload_type),
    INDEX idx_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## TypeScript Interfaces

### ChecklistTemplate
```typescript
export interface ChecklistTemplate {
  id: number;
  name: string;
  description: string;
  part_number: string;
  product_type: string;
  category: 'quality_control' | 'installation' | 'maintenance' | 'inspection';
  version: string;
  is_active: boolean;
  active_instances?: number;        // Calculated field
  item_count?: number;              // Calculated field
  items?: ChecklistItem[];
  created_at: string;
  updated_at: string;
  // Quality document reference for version control and traceability
  quality_document_metadata?: {
    document_id: number;
    revision_id: number;
    document_number: string;
    version_string: string;
    title: string;
    revision_number: number;
  } | null;
}
```

---

### ChecklistItem
```typescript
export interface ChecklistItem {
  id: number;
  template_id: number;
  order_index: number;              // Supports decimals: 14, 14.1, 14.2, etc.
  title: string;
  description: string;
  photo_requirements: PhotoRequirements;
  sample_images: SampleImageData[]; // Array format (extended)
  sample_image_url?: string;        // Single URL format (preferred)
  is_required: boolean;
  max_photos?: number;
  min_photos?: number;
  
  // Hierarchical structure support
  level?: number;                   // 0 = parent/root item, 1 = child/sub-item
  parent_id?: number;               // Reference to parent item's order_index
  children?: ChecklistItem[];       // Sub-items array (populated on read)
  
  // Photo submission data (when part of instance)
  file_name?: string;
  file_url?: string;
  file_type?: 'image' | 'video';
  photo_created_at?: string;
  is_approved?: boolean;
  review_notes?: string;
  
  created_at: string;
  updated_at: string;
}
```

---

### SampleImageData
```typescript
export interface SampleImageData {
  id?: string;                      // Unique identifier for the image
  url: string;                      // Image URL
  label?: string;                   // Image label/title
  description?: string;             // Image description
  type?: 'photo' | 'drawing' | 'bom' | 'schematic' | 'reference' | 'diagram';
  is_primary: boolean;              // Whether this is the primary image
  order_index: number;              // Display order
}
```

---

### PhotoRequirements
```typescript
export interface PhotoRequirements {
  angle?: string;                   // 'front', 'back', 'side', 'top', 'bottom', 'diagonal'
  distance?: string;                // 'close', 'medium', 'far'
  lighting?: string;                // 'bright', 'normal', 'dim'
  focus?: string;                   // Description of what to focus on
  resolution?: string;              // Minimum resolution requirements
  format?: string[];                // Allowed formats
  max_photos?: number;              // Maximum photos allowed (0-10)
  min_photos?: number;              // Minimum photos required (0-10)
}
```

---

### ChecklistInstance
```typescript
export interface ChecklistInstance {
  id: number;
  template_id: number;
  template_name?: string;           // Denormalized for display
  template_description?: string;    // Denormalized for display
  template_version?: string;        // Denormalized for display
  template_category?: string;       // Denormalized for display
  work_order_number: string;
  part_number: string;
  serial_number: string;
  operator_id: number;
  operator_name: string;
  status: 'draft' | 'in_progress' | 'review' | 'completed' | 'submitted';
  progress_percentage: number;      // 0-100
  photo_count?: number;             // Calculated field
  required_items?: number;          // Calculated field
  completed_required?: number;      // Calculated field
  items?: ChecklistItem[];          // Populated with submission data
  started_at?: string;
  completed_at?: string;
  submitted_at?: string;
  created_at: string;
  updated_at: string;
}
```

---

### PhotoSubmission
```typescript
export interface PhotoSubmission {
  id: number;
  instance_id: number;
  item_id: number;
  file_name: string;
  file_path: string;
  file_url: string;
  file_type: 'image' | 'video';
  file_size: number;
  mime_type: string;
  photo_metadata?: any;             // EXIF data, dimensions, etc.
  submission_notes?: string;
  is_approved?: boolean;
  reviewed_by?: number;
  reviewed_at?: string;
  review_notes?: string;
  created_at: string;
  updated_at: string;
}
```

---

### ChecklistConfig
```typescript
export interface ChecklistConfig {
  config_key: string;
  config_value: string;
  description: string;
  config_type: 'string' | 'number' | 'boolean' | 'json';
}
```

---

## JSON Field Structures

### `photo_requirements` JSON Structure
```json
{
  "angle": "front",
  "distance": "close",
  "lighting": "bright",
  "focus": "connector pins",
  "resolution": "1920x1080",
  "format": ["image/jpeg", "image/png"],
  "max_photos": 5,
  "min_photos": 1
}
```

---

### `sample_images` JSON Structure
```json
[
  {
    "id": "img_123456",
    "url": "/uploads/checklist/sample_images/photo1.jpg",
    "label": "Front View - Reference Photo",
    "description": "Shows correct connector alignment",
    "type": "photo",
    "is_primary": true,
    "order_index": 0
  },
  {
    "id": "img_123457",
    "url": "/uploads/checklist/sample_images/diagram1.png",
    "label": "Wiring Diagram",
    "description": "Reference wiring diagram",
    "type": "diagram",
    "is_primary": false,
    "order_index": 1
  }
]
```

---

### `photo_metadata` JSON Structure
```json
{
  "width": 1920,
  "height": 1080,
  "format": "JPEG",
  "exif": {
    "make": "Apple",
    "model": "iPhone 13",
    "datetime": "2025-11-10 14:30:00",
    "gps": {
      "latitude": 40.7128,
      "longitude": -74.0060
    }
  },
  "file_hash": "sha256:abc123...",
  "compressed": true,
  "original_size": 5242880
}
```

---

### `validation_rules` JSON Structure
```json
{
  "min_resolution": "1280x720",
  "max_file_size_mb": 10,
  "required_exif_fields": ["datetime", "gps"],
  "auto_reject_blurry": true,
  "brightness_range": {
    "min": 20,
    "max": 240
  }
}
```

---

## Hierarchical Item Structure

### Database Representation
```
checklist_items table:
| id | template_id | order_index | parent_id | level | title                    |
|----|-------------|-------------|-----------|-------|--------------------------|
| 50 | 1           | 14          | NULL      | 0     | Check connector align    |
| 51 | 1           | 14.1        | 14        | 1     | Reference Photo 1        |
| 52 | 1           | 14.2        | 14        | 1     | Reference Photo 2        |
| 53 | 1           | 14.3        | 14        | 1     | Reference Photo 3        |
| 54 | 1           | 15          | NULL      | 0     | Verify power connections |
| 55 | 1           | 15.1        | 15        | 1     | Power supply close-up    |
```

### TypeScript Representation (Nested)
```typescript
const checklistItems: ChecklistItem[] = [
  {
    id: 50,
    template_id: 1,
    order_index: 14,
    parent_id: null,
    level: 0,
    title: "Check connector alignment",
    description: "Verify all connectors are properly aligned",
    is_required: true,
    children: [
      {
        id: 51,
        template_id: 1,
        order_index: 14.1,
        parent_id: 14,
        level: 1,
        title: "Reference Photo 1",
        description: "Front view of connector",
        is_required: true
      },
      {
        id: 52,
        template_id: 1,
        order_index: 14.2,
        parent_id: 14,
        level: 1,
        title: "Reference Photo 2",
        description: "Side view of connector",
        is_required: true
      }
    ]
  },
  {
    id: 54,
    template_id: 1,
    order_index: 15,
    parent_id: null,
    level: 0,
    title: "Verify power connections",
    description: "Check all power connections are secure",
    is_required: true,
    children: [
      {
        id: 55,
        template_id: 1,
        order_index: 15.1,
        parent_id: 15,
        level: 1,
        title: "Power supply close-up",
        description: "Close-up of power supply connections",
        is_required: true
      }
    ]
  }
];
```

---

## API Endpoints

### Template Management
- `GET /photo-checklist/photo-checklist-config.php?request=templates` - List all templates
- `GET /photo-checklist/photo-checklist-config.php?request=template&id={id}` - Get specific template
- `POST /photo-checklist/photo-checklist-config.php?request=templates` - Create new template
- `PUT /photo-checklist/photo-checklist-config.php?request=template&id={id}` - Update template
- `DELETE /photo-checklist/photo-checklist-config.php?request=template&id={id}` - Delete template

### Instance Management
- `GET /photo-checklist/photo-checklist-config.php?request=instances` - List all instances
- `GET /photo-checklist/photo-checklist-config.php?request=instance&id={id}` - Get specific instance
- `POST /photo-checklist/photo-checklist-config.php?request=instances` - Create new instance
- `PUT /photo-checklist/photo-checklist-config.php?request=instance&id={id}` - Update instance
- `GET /photo-checklist/photo-checklist-config.php?request=search_instances&{filters}` - Search instances

### Photo Management
- `POST /photo-checklist/photo-checklist-config.php?request=photos` - Upload photo
- `DELETE /photo-checklist/photo-checklist-config.php?request=photo&id={id}` - Delete photo

### Configuration
- `GET /photo-checklist/photo-checklist-config.php?request=config` - Get configuration
- `POST /photo-checklist/photo-checklist-config.php?request=config` - Update configuration

---

## Status Flow

### Template Lifecycle
```
Draft → Active → Inactive → Archived
```

### Instance Lifecycle
```
draft → in_progress → review → completed → submitted
  ↓         ↓            ↓         ↓
  ↓     (photos)    (approval) (final)
  ↓         ↓            ↓         ↓
  └─────────┴────────────┴─────────┘
         (can revert to previous status)
```

---

## Key Features

### 1. Hierarchical Structure
- Support for parent-child relationships (2 levels)
- Parent items can have multiple sub-items
- Decimal ordering system (14, 14.1, 14.2, etc.)
- Automatic re-parenting on drag-and-drop
- Cascade delete: removing parent removes all children

### 2. Sample Images
- Two formats supported:
  - **Preferred:** `sample_image_url` (single URL string)
  - **Legacy:** `sample_images` (JSON array of image objects)
- Multiple image types: photo, drawing, BOM, schematic, reference, diagram
- Image metadata tracking (label, description, type, order)

### 3. Photo Requirements
- Flexible JSON structure for defining requirements
- Angle, distance, lighting, focus specifications
- Min/max photo count enforcement
- Format and resolution requirements

### 4. Version Control
- Templates create new versions on edit
- Previous versions remain available for reference
- Quality document integration for compliance tracking

### 5. Progress Tracking
- Automatic progress percentage calculation
- Required vs optional item tracking
- Status-based workflow

### 6. Audit Trail
- Complete action logging
- User tracking with IP address
- Detailed change history

---

## Indexing Strategy

### Performance Indexes
- Template lookups: `idx_part_number`, `idx_product_type`, `idx_category`
- Instance searches: `idx_work_order`, `idx_serial_number`, `idx_status`
- Hierarchical queries: `idx_parent`, `idx_level`
- Date-based queries: `idx_dates`

### Composite Indexes
- `idx_template_order (template_id, order_index)` - Fast ordered retrieval
- `idx_instance_item (instance_id, item_id)` - Photo submission lookups

---

## Migration Notes

### From Old Schema to New Schema
If migrating from single-level to hierarchical structure:

```sql
-- All existing items become level 0 (parent items)
UPDATE checklist_items SET level = 0 WHERE level IS NULL;
UPDATE checklist_items SET parent_id = NULL WHERE parent_id IS NULL;

-- Migrate single sample_image_url to sample_images array
UPDATE checklist_items 
SET sample_images = JSON_ARRAY(
    JSON_OBJECT(
        'url', sample_image_url,
        'label', 'Sample Image',
        'description', '',
        'type', 'photo',
        'is_primary', true,
        'order_index', 0
    )
)
WHERE sample_image_url IS NOT NULL AND sample_image_url != '';
```

---

## Constraints and Validation

### Template Level
- `name` must be unique per version
- `category` must be valid enum value
- At least one item required

### Item Level
- `order_index` must be unique within template
- `level` must be 0 or 1
- If `level = 1`, `parent_id` must reference valid parent item
- Parent items (`level = 0`) cannot have `parent_id`

### Instance Level
- `work_order_number` + `template_id` should be unique (soft constraint)
- `status` transitions must follow workflow
- Cannot delete instance with status 'submitted'

### Photo Submission Level
- File size must be within configured limits
- MIME type must be in allowed list
- One photo per item (unless max_photos allows more)

---

## Best Practices

### Template Design
1. Use clear, concise titles
2. Provide detailed descriptions for each item
3. Include sample images wherever possible
4. Set appropriate min/max photo requirements
5. Group related items using hierarchy

### Instance Management
1. Start instances when work begins (update `started_at`)
2. Update progress regularly
3. Complete review before submission
4. Include meaningful notes with photo submissions

### Photo Quality
1. Enable compression to reduce storage
2. Enforce minimum resolution requirements
3. Validate EXIF data for traceability
4. Store original filename for reference

### Performance
1. Index frequently queried fields
2. Paginate large result sets
3. Cache template data when possible
4. Use composite indexes for complex queries
5. Archive old instances regularly

---

## Future Enhancements

### Planned Features
1. **Multi-level Hierarchy** - Support for 3+ levels (grandchildren)
2. **Digital Signatures** - Cryptographic signing of completed checklists
3. **Offline Support** - Progressive Web App capabilities
4. **AI Validation** - Automatic photo quality assessment
5. **Batch Operations** - Bulk template creation and updates
6. **Custom Fields** - User-defined fields per template
7. **Scheduled Templates** - Automatic instance creation on schedule

### Schema Extensions Required
- `level` field expanded to support values > 1
- `checklist_signatures` table for digital signatures
- `custom_fields` JSON column in templates
- `schedule_config` JSON column in templates

---

## References

- Database Migration Files: `/backend/database/migrations/`
- TypeScript Service: `/src/app/core/api/photo-checklist-config/photo-checklist-config.service.ts`
- Component: `/src/app/pages/quality/checklist-template-editor/checklist-template-editor.component.ts`
- API Endpoint: `/photo-checklist/photo-checklist-config.php`

---

**Document Version:** 2.0  
**Last Updated:** November 10, 2025  
**Maintained By:** Development Team
