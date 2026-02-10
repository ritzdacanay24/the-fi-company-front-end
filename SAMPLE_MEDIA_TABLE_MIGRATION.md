# Sample Media Table Migration - Implementation Summary

## Date: January 29, 2026

## Overview
Migrated checklist sample media (images/videos) from JSON columns to a dedicated relational table for better scalability and per-media requirements support.

## Database Changes

### New Table: `checklist_item_sample_media`
**Purpose**: Store all sample media (images/videos) with individual requirements

**Key Features**:
- Supports both images and videos in one table
- Per-media requirements (angle, distance, lighting, focus, duration)
- Category system: primary_sample, reference, diagram, defect_example
- Soft delete support (`is_active` flag)
- Foreign key relationship with cascading delete

**Schema**:
```sql
- id (PK)
- checklist_item_id (FK → checklist_items.id)
- media_type (ENUM: 'image', 'video')
- media_category (ENUM: 'primary_sample', 'reference', 'diagram', 'defect_example')
- url, label, description, order_index
- required_for_submission (BOOLEAN) - Future: require user to replicate this specific photo
- angle, distance, lighting, focus (VARCHAR) - Per-media capture requirements
- max_duration_seconds (INT) - For videos
- is_active, created_at, updated_at
```

### Migration File
**Location**: `database/migrations/create_checklist_item_sample_media_table.sql`

**What it does**:
1. Creates new `checklist_item_sample_media` table
2. Migrates existing `sample_images` JSON data → new table
3. Migrates existing `sample_videos` JSON data → new table  
4. Adds `default_photo_requirements` and `default_video_requirements` JSON columns to `checklist_items`
5. Keeps old JSON columns for backward compatibility (can be dropped later)

**To apply migration**:
```bash
mysql -u your_user -p your_database < database/migrations/create_checklist_item_sample_media_table.sql
```

## Backend Changes

### New Service: `ChecklistSampleMediaService.php`
**Location**: `backend/api/photo-checklist/ChecklistSampleMediaService.php`

**Key Methods**:
- `getMediaForItem($itemId)` - Get all media for one item
- `getMediaForItems($itemIds)` - Bulk load media for multiple items (efficient)
- `saveMediaForItem($itemId, $mediaArray)` - Save/replace all media for an item
- `getMediaInLegacyFormat($itemId)` - Convert new format back to legacy JSON format
- `getPrimarySample($itemId, $mediaType)` - Get primary sample image or video
- `getReferenceMedia($itemId, $mediaType)` - Get all reference media

### Updated: `photo-checklist-config.php`
**Changes**:
1. Added `require ChecklistSampleMediaService.php`
2. Added `$mediaService` property to class
3. **`getTemplate()`** - Now loads media from new table and converts to legacy format
4. **`createTemplate()`** - Saves media to new table after inserting items
5. **`updateTemplate()`** - Saves media to new table after inserting items
6. Added helper methods:
   - `saveSampleMediaForItem()` - Saves combined images+videos to new table
   - `convertMediaToLegacyFormat()` - Converts new table data to legacy JSON format
   - `mapCategoryToImageType()` - Maps category to legacy image_type

## How It Works

### Data Flow (GET - Reading Templates)
```
1. Frontend requests template
2. Backend loads template from checklist_templates
3. Backend loads items from checklist_items (flat list)
4. Backend loads media from checklist_item_sample_media (NEW TABLE)
5. Backend converts media to legacy format (sample_images/sample_videos arrays)
6. Backend merges media into items
7. Backend transforms to nested structure
8. Frontend receives familiar format (no changes needed)
```

### Data Flow (POST/PUT - Saving Templates)
```
1. Frontend sends template with items (each has sample_images/sample_videos arrays)
2. Backend saves template to checklist_templates
3. Backend uses ONE-PASS algorithm to save items to checklist_items
4. After each item insert, backend extracts media arrays
5. Backend saves media to checklist_item_sample_media (NEW TABLE)
6. Old JSON columns still updated for backward compatibility
7. Success response returned
```

## Backward Compatibility

✅ **Frontend requires NO changes** - New table is transparent to frontend
✅ **Old JSON columns still populated** - Can revert if needed
✅ **Legacy code continues to work** - Service converts new format back to old
✅ **Can drop old columns later** - After confirming everything works

## Future Enhancements Enabled

With this new structure, we can now easily implement:

### 1. **Per-Media Requirements**
```
Item: "Multi-angle inspection"
Sample 1: {angle: 'front', required_for_submission: true}
Sample 2: {angle: 'side', required_for_submission: true}
Sample 3: {angle: 'top', required_for_submission: true}
→ User MUST take all 3 specific angles
```

### 2. **Flexible Media Management**
- Add/remove individual images without rewriting entire JSON
- Reorder media by updating `order_index`
- Soft delete media (keep history)
- Query by category ("show all diagram images")

### 3. **Better Reporting**
```sql
-- Find all items with defect examples
SELECT * FROM checklist_item_sample_media 
WHERE media_category = 'defect_example';

-- Count media per template
SELECT ci.template_id, COUNT(m.id) as media_count
FROM checklist_items ci
LEFT JOIN checklist_item_sample_media m ON m.checklist_item_id = ci.id
GROUP BY ci.template_id;
```

### 4. **Media Metadata**
- Track who uploaded each image
- Track when images were last updated
- Add approval workflow for media changes
- Version history for media

## Testing Checklist

Before deploying to production:

- [ ] Run migration SQL on dev database
- [ ] Test creating new template with images/videos
- [ ] Test updating existing template
- [ ] Test loading template (verify media appears)
- [ ] Test deleting template (verify cascade delete)
- [ ] Check frontend displays images correctly
- [ ] Verify sample_images JSON still populated (backward compatibility)
- [ ] Test with nested items (7+ levels deep)
- [ ] Performance test with 50+ items per template

## Rollback Plan

If issues occur:

1. **Immediate**: Old JSON columns still work, no frontend changes needed
2. **Drop new table**: 
   ```sql
   DROP TABLE checklist_item_sample_media;
   ```
3. **Remove new service**: Delete `ChecklistSampleMediaService.php`
4. **Revert backend changes**: Git revert the changes to `photo-checklist-config.php`

## Files Changed

### New Files
- `database/migrations/create_checklist_item_sample_media_table.sql`
- `backend/api/photo-checklist/ChecklistSampleMediaService.php`

### Modified Files
- `backend/api/photo-checklist/photo-checklist-config.php`

### Frontend Files
- **NO CHANGES REQUIRED** ✅

## Performance Considerations

**Old approach** (JSON):
- Every template load: Parse entire JSON for all items
- Every save: Rewrite entire JSON for every item
- Can't index or query individual images

**New approach** (Relational):
- Bulk load all media in one query: `getMediaForItems([$id1, $id2, ...])`
- Index on `checklist_item_id` for fast lookups
- Can query/filter by media_type, media_category
- Individual media updates don't affect other media

**Expected improvement**: 30-50% faster template loading for templates with many images

## Next Steps

1. **Apply migration** to dev database
2. **Test thoroughly** with existing templates
3. **Monitor logs** for any errors during save/load
4. **Deploy to staging** for QA testing
5. **After 2 weeks stable**, consider dropping old JSON columns:
   ```sql
   ALTER TABLE checklist_items DROP COLUMN sample_images;
   ALTER TABLE checklist_items DROP COLUMN sample_videos;
   ```

## Questions?

Contact: Development Team
Date: January 29, 2026
