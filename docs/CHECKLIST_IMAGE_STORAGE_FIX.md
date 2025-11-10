# Checklist Image Storage Fix

## Problem

Images were being stored inconsistently:

1. **PDF Import**: Images stored as **base64 data URLs** (`data:image/png;base64,iVBORw0KG...`)
2. **Manual Upload**: Images stored as **server file paths** (`/uploads/checklist-images/image123.jpg`)

This caused imported images to not display because:
- Base64 strings were being saved directly to the database
- Frontend expected file URLs to load images
- Large base64 strings bloated the database

## Solution

**Unified Approach**: All images are now converted to **server file paths** for consistency.

### Changes Made

#### 1. **PDF Parser Service** (`pdf-parser.service.ts`)

**Before:**
```typescript
// Images kept as base64 - PROBLEMATIC
return {
  images: response.images.map(img => img.url),  // base64 strings
  groups: response.imageGroups || []
};
```

**After:**
```typescript
// Convert base64 to file URLs
const base64Images = response.images.map(img => img.url);
const fileUrls = await this.saveImagesToFiles(base64Images);

// Update groups with file URLs
const updatedGroups = response.imageGroups?.map((group: any) => ({
  ...group,
  images: group.images?.map((img: any, idx: number) => ({
    ...img,
    url: fileUrls[response.images.findIndex((ri: any) => ri.url === img.url)] || img.url
  }))
})) || [];

return {
  images: fileUrls,  // File paths, not base64
  groups: updatedGroups
};
```

#### 2. **Backend Endpoint** (`save-checklist-image.php`)

Already exists and handles:
- Converting base64 to binary data
- Optimizing images (PNG → JPEG if no transparency)
- Compressing JPEG images to 85% quality
- Saving to `/uploads/checklist-images/`
- Returning relative file paths

### How It Works

```
┌─────────────────┐
│  PDF Import     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Backend extracts images         │
│ Returns base64 data URLs        │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Frontend: saveImagesToFiles()   │
│ POST to save-checklist-image.php│
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Backend saves to disk           │
│ Returns: /uploads/checklist-    │
│         images/file123.jpg       │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Frontend saves file URLs to DB  │
│ (same as manual upload)         │
└─────────────────────────────────┘
```

### Benefits

✅ **Consistent Storage**: Both import and manual upload use file paths  
✅ **Smaller Database**: No large base64 strings in database  
✅ **Better Performance**: Files served directly by web server  
✅ **Image Optimization**: Automatic compression reduces storage  
✅ **Easy Caching**: Browser can cache image files  
✅ **Scalable**: Can move to CDN/S3 later without schema changes  

### File Structure

```
backend/
├── uploads/
│   └── checklist-images/
│       ├── checklist_img_673123abc.jpg
│       ├── checklist_img_673123def.png
│       └── .htaccess (security)
└── api/
    └── quality/
        └── save-checklist-image.php
```

### Database Storage

**checklist_items table:**
```sql
CREATE TABLE checklist_items (
    ...
    sample_image_url VARCHAR(500),  -- Stores: /uploads/checklist-images/file.jpg
    sample_images JSON,              -- Stores: [{"url": "/uploads/...", "label": "..."}]
    ...
);
```

### Security Considerations

1. **Upload Directory**: Located outside webroot with `.htaccess` protection
2. **File Validation**: Only accepts valid image data URLs
3. **Unique Filenames**: Uses `uniqid()` with entropy to prevent collisions
4. **File Type Restriction**: Only image types allowed (png, jpg, webp, gif)
5. **Size Limits**: Enforced by PHP `upload_max_filesize` and `post_max_size`

### Image Optimization

The backend automatically optimizes images:

1. **PNG → JPEG**: Converts PNG without transparency to JPEG (85% quality)
2. **JPEG Recompression**: Re-compresses existing JPEGs to 85% quality
3. **Size Check**: Only uses optimized version if it's actually smaller
4. **Transparency Preservation**: Keeps PNG format if transparency detected

### Fallback Behavior

If file saving fails:
- Frontend catches error and logs it
- Falls back to original base64 (temporary)
- Allows template creation to complete
- Admin can re-upload images later

### Testing

To verify the fix works:

1. **Import a PDF with images**
   ```
   - Navigate to Template Editor
   - Click "Import" button
   - Select a PDF with images
   - Check console for "Saved X images to disk"
   - Verify images display in preview
   ```

2. **Check database**
   ```sql
   SELECT id, title, sample_image_url 
   FROM checklist_items 
   WHERE template_id = [your_template_id];
   ```
   Should show: `/uploads/checklist-images/checklist_img_*.jpg`

3. **Verify files exist**
   ```
   ls backend/uploads/checklist-images/
   ```

### Migration Notes

**For existing templates with base64 images:**

Run this migration to convert existing base64 to files:

```php
<?php
// migration-convert-base64-to-files.php

require_once 'config/database.php';

$db = new PDO($dsn, $username, $password);

// Find all items with base64 sample_image_url
$stmt = $db->query("
    SELECT id, sample_image_url 
    FROM checklist_items 
    WHERE sample_image_url LIKE 'data:image%'
");

$converted = 0;
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    // Convert base64 to file
    $result = convertBase64ToFile($row['sample_image_url']);
    
    if ($result['success']) {
        // Update database with file URL
        $update = $db->prepare("
            UPDATE checklist_items 
            SET sample_image_url = ? 
            WHERE id = ?
        ");
        $update->execute([$result['url'], $row['id']]);
        $converted++;
    }
}

echo "Converted $converted images from base64 to files\n";
```

### Configuration

**PHP Settings** (php.ini or .htaccess):
```ini
upload_max_filesize = 10M
post_max_size = 12M
memory_limit = 256M
max_execution_time = 300
```

**Directory Permissions**:
```bash
chmod 755 backend/uploads/checklist-images
```

### Monitoring

Check these logs for issues:

1. **PHP Error Log**: `/var/log/php/error.log`
2. **Browser Console**: Frontend conversion progress
3. **Network Tab**: Check POST to `save-checklist-image.php`

### Future Improvements

1. **CDN Integration**: Move files to CloudFlare/AWS CloudFront
2. **Lazy Loading**: Load images on demand
3. **WebP Support**: Convert all images to WebP for smaller sizes
4. **Thumbnail Generation**: Create multiple sizes for different uses
5. **Bulk Migration Tool**: UI for converting old base64 images

---

## Summary

The fix ensures that **all** checklist images (imported or manually uploaded) are stored as **file paths** on the server, providing consistency, better performance, and smaller database size.

**Status**: ✅ **Fixed and Deployed**

**Date**: November 10, 2025
