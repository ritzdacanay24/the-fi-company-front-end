# Sample vs Reference Images Feature

## Overview
Implemented a clear distinction between **Primary Sample Images** (what users should replicate) and **Reference Images** (additional context) in the Photo Checklist system.

## Business Rules

### Primary Sample Image
- **Maximum**: 1 per checklist item
- **Purpose**: The exact photo users should match when taking inspection photos
- **Marked by**: `is_primary = true` AND `image_type = 'sample'`
- **Display**: Prominent with "Match This Photo" label and blue border

### Reference Images
- **Maximum**: 5 per checklist item
- **Purpose**: Additional context (different angles, defect examples, diagrams)
- **Types**: 
  - `reference` - General reference photos
  - `defect_example` - Examples of defects/issues
  - `diagram` - Technical diagrams or schematics
- **Display**: Collapsible gallery below primary sample

### Total Limit
- Maximum 6 images per item (1 primary sample + 5 reference)

## Implementation Details

### 1. Database Schema (`database/migrations/add_image_type_to_sample_images.sql`)
- Added `image_type` field to JSON structure in `sample_images` column
- Documented JSON structure and business rules
- Added table comment for clarity

**JSON Structure**:
```json
[
  {
    "url": "https://...",
    "label": "Primary Sample Image",
    "description": "This is what users should replicate",
    "type": "photo",
    "image_type": "sample",
    "is_primary": true,
    "order_index": 0
  },
  {
    "url": "https://...",
    "label": "Reference - Side View",
    "image_type": "reference",
    "is_primary": false,
    "order_index": 1
  }
]
```

### 2. Backend Validation (`backend/api/photo-checklist/photo-checklist-config.php`)

**New Methods**:
- `validateSampleImages($sampleImages)` - Enforces 1 primary + max 5 reference limit
- `normalizeSampleImages($sampleImages)` - Ensures all images have required fields including `image_type`

**Validation Rules**:
- Only 1 image can have `is_primary=true` AND `image_type='sample'`
- Maximum 5 reference images (non-primary or non-sample type)
- Maximum 6 total images per item
- Throws exception with clear error message if validation fails

**Integration**:
- Validation called during template creation in `createTemplate()` method
- Automatic normalization ensures consistent data structure

### 3. Template Editor UI (`src/app/pages/quality/checklist/template-editor/checklist-template-editor.component.ts`)

**Interface Update**:
```typescript
interface SampleImage {
  id?: string;
  url: string;
  label?: string;
  description?: string;
  type?: 'photo' | 'drawing' | 'bom' | 'schematic' | 'reference' | 'diagram';
  image_type?: 'sample' | 'reference' | 'defect_example' | 'diagram';  // NEW
  is_primary: boolean;
  order_index: number;
  status?: 'loading' | 'loaded' | 'error';
}
```

**New Methods**:

**Primary Sample Image**:
- `hasPrimarySampleImage(itemIndex)` - Check if item has primary sample
- `getPrimarySampleImage(itemIndex)` - Get the primary sample image
- `getPrimarySampleImageUrl(itemIndex)` - Get sanitized URL for display
- `openPrimarySampleImageUpload(itemIndex)` - Open file picker for primary sample
- `uploadPrimarySampleImage(itemIndex, file)` - Upload and set as primary sample
- `removePrimarySampleImage(itemIndex)` - Remove primary sample

**Reference Images**:
- `getReferenceImages(itemIndex)` - Get all reference images
- `getReferenceImageCount(itemIndex)` - Count reference images (max 5 check)
- `openReferenceImageUpload(itemIndex)` - Open file picker for reference
- `uploadReferenceImage(itemIndex, file)` - Upload new reference image
- `removeReferenceImage(itemIndex, refImageIndex)` - Remove specific reference
- `previewReferenceImage(itemIndex, refImageIndex)` - Preview in new tab

**UI Layout**:
```html
<!-- Primary Sample Image Section -->
- Large, prominent display (150x150px)
- Blue border and background
- "Match This Photo" label
- Primary badge
- Replace button
- Clear visual hierarchy

<!-- Reference Images Section -->
- Smaller thumbnails grid (100px height)
- Counter badge showing X/5
- Disabled "Add" button at limit
- Individual labels and type selection
- Category dropdown per image (reference/defect/diagram)
```

### 4. Template Preview Modal (`src/app/pages/quality/checklist/checklist.component.html`)

**For Parent Items**:
```html
<!-- Primary Sample -->
- Large display (250x180px)
- Thick primary border (3px)
- "Match This Photo" prominent label
- Primary badge
- Instruction text

<!-- Reference Images -->
- Collapsible section with collapse/expand button
- Badge shows count
- Grid layout (3 columns on desktop, 2 on tablet)
- Smaller thumbnails (100px height)
- Image type labels
```

**For Child Items**:
```html
<!-- Primary Sample -->
- Medium size (150x100px)
- Info-colored border
- "Match This" label
- Compact layout for nested display

<!-- Reference Images -->
- 2-column grid
- Tiny thumbnails (60px height)
- Optimized for space in nested layout
```

**New Helper Method**:
```typescript
getReferenceImages(sampleImages: any[]): any[] {
  return sampleImages.filter(img => 
    !img.is_primary || img.image_type !== 'sample'
  );
}
```

### 5. Image Upload Endpoints

Both upload methods call the same endpoint:
```
POST: https://dashboard.eye-fi.com/backend/api/photo-checklist/photo-checklist-upload.php
```

**Parameters**:
- `file` - The image file
- `upload_type` - Either `'sample_image'` or `'reference_image'`

**Response**:
```json
{
  "success": true,
  "url": "https://..."
}
```

## User Experience

### Template Creation/Editing
1. Admin opens template editor
2. For each checklist item:
   - **Primary Sample**: Click "Add Sample" → Upload THE reference photo users should match
   - **Reference Images**: Click "Add Reference" (up to 5 times) → Upload supporting images
   - Each reference can be labeled and categorized (Reference/Defect Example/Diagram)

### Template Preview
1. Admin clicks "Preview" on a template
2. For each item:
   - Primary sample shown prominently with "Match This Photo" instruction
   - Reference images hidden in collapsible section to reduce clutter
   - Click "Additional Reference Images" to expand gallery
   - All images clickable for full-screen preview

### Checklist Inspection (Future - Task #6)
1. User starts checklist inspection
2. For each item:
   - Primary sample displayed at top
   - User takes photo
   - Photo shown side-by-side with primary sample for comparison
   - Reference images available in expandable section if needed

## Migration Path

### Existing Templates
- Old templates with single `sample_image_url` automatically converted
- Backend creates proper JSON structure on first load:
  ```php
  if (!empty($sampleImageUrl)) {
    $sampleImagesArray = [[
      'url' => $sampleImageUrl,
      'label' => 'Primary Sample Image',
      'image_type' => 'sample',
      'is_primary' => true,
      'order_index' => 0
    ]];
  }
  ```

### Backward Compatibility
- `sample_image_url` column maintained for legacy support
- Both columns (`sample_image_url` and `sample_images`) updated on save
- Old code continues to work with single image

## Testing Checklist

- [ ] Create new template with primary sample only
- [ ] Create template with primary sample + 5 reference images
- [ ] Try to add 6th reference image (should be disabled/prevented)
- [ ] Try to add 2nd primary sample (backend should reject)
- [ ] Upload different image types (JPG, PNG, GIF, WebP)
- [ ] Preview template - verify primary sample prominent display
- [ ] Preview template - verify reference images in collapsible section
- [ ] Edit existing template - verify images load correctly
- [ ] Remove primary sample - verify can add new one
- [ ] Remove reference image - verify count updates
- [ ] Verify Word document import still works
- [ ] Test nested items - verify images display correctly
- [ ] Test on mobile/tablet - verify responsive layout

## Next Steps (Task #6)

Update the actual checklist inspection view to:
1. Display primary sample image prominently at top of each item
2. Show user's captured photo side-by-side with primary sample
3. Add reference images in collapsible "See more examples" section
4. Implement zoom/comparison tools for quality verification

## Files Modified

1. `database/migrations/add_image_type_to_sample_images.sql` - Schema documentation
2. `backend/api/photo-checklist/photo-checklist-config.php` - Validation logic
3. `src/app/pages/quality/checklist/template-editor/checklist-template-editor.component.ts` - Editor UI and logic
4. `src/app/pages/quality/checklist/checklist.component.html` - Preview modal
5. `src/app/pages/quality/checklist/checklist.component.ts` - Helper methods

## Benefits

✅ **Clear Purpose**: Users know exactly which photo to replicate
✅ **Reduced Confusion**: Primary sample always prominent
✅ **Better Context**: Reference images provide additional information without cluttering UI
✅ **Flexible**: Support for different reference types (defects, diagrams, etc.)
✅ **Validated**: Backend ensures data integrity
✅ **Scalable**: Easy to extend with more image types if needed
✅ **Backward Compatible**: Existing templates continue to work
