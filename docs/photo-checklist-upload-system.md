# Photo Checklist Upload System

## Overview
The Photo Checklist Upload System provides dedicated endpoints and services for managing sample images in checklist templates. This system ensures proper file organization, database synchronization, and temporary file handling during template editing.

## Backend API Endpoints

### 1. Upload Sample Image
**Endpoint:** `/backend/api/photo-checklist/upload-sample-image.php`
**Method:** POST
**Purpose:** Upload and save sample images for existing checklist items

**Parameters:**
- `template_id` (int): ID of the checklist template
- `item_id` (int): ID of the checklist item
- `file` (file): Image file to upload

**Response:**
```json
{
  "success": true,
  "url": "https://dashboard.eye-fi.com/attachments/photoChecklist/template_1_item_5_abc123.jpg",
  "filename": "template_1_item_5_abc123.jpg",
  "template_id": 1,
  "item_id": 5,
  "item_title": "Serial Number Photo",
  "template_name": "IGT Video Wall QC",
  "message": "Image uploaded successfully"
}
```

### 2. Upload Temporary Image
**Endpoint:** `/backend/api/photo-checklist/upload-temp-image.php`
**Method:** POST
**Purpose:** Upload images for templates/items that haven't been saved yet

**Parameters:**
- `temp_id` (string): Temporary identifier for the upload
- `file` (file): Image file to upload

**Response:**
```json
{
  "success": true,
  "url": "https://dashboard.eye-fi.com/attachments/photoChecklist/temp/temp_abc123_def456.jpg",
  "filename": "temp_abc123_def456.jpg",
  "temp_id": "abc123",
  "file_size": 1048576,
  "message": "Temporary image uploaded successfully"
}
```

### 3. Delete Image
**Endpoint:** `/backend/api/photo-checklist/delete-image.php`
**Method:** DELETE
**Purpose:** Delete uploaded images and clean up database references

**Request Body:**
```json
{
  "image_url": "https://dashboard.eye-fi.com/attachments/photoChecklist/template_1_item_5_abc123.jpg"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Image deleted successfully",
  "filename": "template_1_item_5_abc123.jpg"
}
```

## File Organization

### Directory Structure
```
attachments/
└── photoChecklist/
    ├── template_1_item_5_abc123.jpg     # Permanent files
    ├── template_2_item_3_def456.png     # Named with template and item IDs
    └── temp/
        ├── temp_abc123_ghi789.jpg       # Temporary files
        └── temp_def456_jkl012.png       # Cleaned up after template save
```

### Naming Convention
- **Permanent files:** `template_{template_id}_item_{item_id}_{unique_id}.{ext}`
- **Temporary files:** `temp_{temp_id}_{unique_id}.{ext}`

## Database Schema

### Upload Log Table
```sql
CREATE TABLE checklist_upload_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    template_id INT NOT NULL,
    item_id INT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size INT DEFAULT NULL,
    uploaded_by INT DEFAULT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_template_id (template_id),
    INDEX idx_item_id (item_id),
    FOREIGN KEY (template_id) REFERENCES checklist_templates(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES checklist_items(id) ON DELETE CASCADE
);
```

## Angular Service Usage

### Import the Service
```typescript
import { PhotoChecklistUploadService } from '@app/core/api/photo-checklist/photo-checklist-upload.service';
```

### Upload Sample Image
```typescript
async uploadImage(file: File, templateId: number, itemId: number) {
  try {
    const response = await this.photoUploadService.uploadSampleImage({
      template_id: templateId,
      item_id: itemId,
      file: file
    });
    
    if (response.success) {
      console.log('Upload successful:', response.url);
      // Update your form or UI
    }
  } catch (error) {
    console.error('Upload failed:', error.error);
  }
}
```

### Upload Temporary Image
```typescript
async uploadTempImage(file: File, tempId: string) {
  try {
    const response = await this.photoUploadService.uploadTemporaryImage(file, tempId);
    
    if (response.success) {
      console.log('Temp upload successful:', response.url);
      // Store URL for later processing
    }
  } catch (error) {
    console.error('Temp upload failed:', error.error);
  }
}
```

### Validate File Before Upload
```typescript
validateFile(file: File) {
  const validation = this.photoUploadService.validateImageFile(file);
  
  if (!validation.valid) {
    alert(validation.error);
    return false;
  }
  
  return true;
}
```

## Features

### File Validation
- **Supported formats:** JPEG, PNG, GIF, WebP
- **Maximum size:** 5MB per file
- **Client-side validation:** Immediate feedback before upload
- **Server-side validation:** Double-check for security

### Upload States
- **Uploading:** Visual progress indicator
- **Success:** URL stored in form/database
- **Error:** User-friendly error messages
- **Delete:** Clean removal with database cleanup

### Temporary File Handling
- Files uploaded during template editing are stored as temporary
- Temporary files are moved to permanent storage when template is saved
- Automatic cleanup of unused temporary files

### Database Integration
- Automatic updates to `checklist_items.sample_image_url`
- Upload logging for audit trail
- Foreign key relationships ensure data integrity
- Cascade deletion when templates/items are removed

## Security Considerations

1. **File type validation:** Only images allowed
2. **File size limits:** Prevent large file uploads
3. **Directory traversal protection:** Sanitized filenames
4. **Database prepared statements:** SQL injection prevention
5. **CORS headers:** Proper cross-origin configuration
6. **File permissions:** Secure upload directory permissions (755)

## Migration Instructions

1. Run the migration script to create the upload log table:
   ```sql
   SOURCE backend/database/migrations/create_checklist_upload_log_table.sql;
   ```

2. Ensure upload directories exist with proper permissions:
   ```bash
   mkdir -p attachments/photoChecklist/temp
   chmod 755 attachments/photoChecklist
   chmod 755 attachments/photoChecklist/temp
   ```

3. Update your Angular component to use the new upload service
4. Test the upload functionality with the new endpoints

## Future Enhancements

- Image resizing/thumbnails
- Batch upload support
- Progress tracking for large files
- Image optimization/compression
- CDN integration
- Advanced file management UI
