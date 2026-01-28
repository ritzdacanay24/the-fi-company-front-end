# Submission Type Column Refactoring

## Overview
Refactored `submission_type` from being nested in the `photo_requirements` JSON column to a separate ENUM column in the `checklist_items` table for cleaner schema design, better query efficiency, and logical clarity.

## Database Schema Changes

### New Columns to Add
Execute these migrations IN ORDER:

#### 1. Add submission_type ENUM Column
```sql
ALTER TABLE checklist_items 
ADD COLUMN submission_type ENUM('photo', 'video', 'either') DEFAULT 'photo' AFTER photo_requirements;

CREATE INDEX idx_submission_type ON checklist_items(submission_type);
```

**Purpose**: Primary submission mode selector. Mutually exclusive choice between Photo Only, Video Only, or Photo OR Video submissions.

#### 2. Add sample_videos Column  
```sql
ALTER TABLE checklist_items 
ADD COLUMN sample_videos JSON DEFAULT NULL AFTER sample_images;
```

**Purpose**: Store array of reference/sample videos with metadata (url, label, description, duration_seconds, etc.)

#### 3. Add video_requirements Column
```sql
ALTER TABLE checklist_items 
ADD COLUMN video_requirements JSON DEFAULT NULL AFTER sample_videos;
```

**Purpose**: Store video-specific settings like submission_time_seconds, max_video_duration_seconds.

## Backend Changes

### File: `photo-checklist-config.php`

#### Changes to `getTemplate()` Method (Lines 245-320)

1. **Added column detection for submission_type** (Lines ~250):
   ```php
   $checkSubmissionTypeSql = "SHOW COLUMNS FROM checklist_items LIKE 'submission_type'";
   $checkSubmissionTypeStmt = $this->conn->prepare($checkSubmissionTypeSql);
   $checkSubmissionTypeStmt->execute();
   $hasSubmissionTypeColumn = $checkSubmissionTypeStmt->rowCount() > 0;
   ```

2. **Updated SELECT clause** (Lines ~260):
   - Added `submission_type` to SELECT fields when column exists
   - Maintains backward compatibility for databases without the column

3. **Added submission_type extraction in response parsing** (Lines ~285-295):
   - Extracts submission_type from ENUM column if it exists
   - Falls back to photo_requirements JSON if column doesn't exist
   - Defaults to 'photo' if neither available
   - This ensures compatibility across DB versions during migration

#### Changes to `createTemplate()` Method (Lines 600-950)

1. **Added column detection for submission_type** (Lines ~602-606):
   - Same pattern as getTemplate()

2. **Updated submission_type extraction logic** (Lines ~725-742):
   - Extracts submission_type from frontend's photo_requirements
   - Removes from JSON if column exists (avoid duplication)
   - Keeps in JSON for backward compatibility on older databases
   ```php
   $photoRequirements = $item['photo_requirements'] ?? [];
   $submissionType = 'photo'; // Default
   
   if (isset($photoRequirements['submission_type'])) {
       $submissionType = $photoRequirements['submission_type'];
   }
   
   // If submission_type column exists, remove from JSON to avoid duplication
   if ($hasSubmissionTypeColumn && isset($photoRequirements['submission_type'])) {
       unset($photoRequirements['submission_type']);
   } else if (!$hasSubmissionTypeColumn && !isset($photoRequirements['submission_type'])) {
       // Older DB without column - keep in JSON for backward compatibility
       $photoRequirements['submission_type'] = $submissionType;
   }
   ```

3. **Updated INSERT statements** (Lines ~745-900):
   - Refactored from 2-way conditionals (with/without video_requirements) to 4-way conditionals:
     - With submission_type + video_requirements columns
     - With submission_type only
     - With video_requirements only
     - With neither (oldest version)
   - Each INSERT now includes `submission_type` parameter when column exists

#### Changes to `updateTemplate()` Method (Lines 1067-1340)

1. **Added column detection for submission_type** (Lines ~1074-1078):
   - Same pattern as createTemplate()

2. **Updated submission_type extraction logic** (Lines ~1192-1209):
   - Identical logic to createTemplate() for consistency

3. **Updated INSERT statements** (Lines ~1212-1400):
   - Identical 4-way conditional pattern as createTemplate()

## Frontend Impact

### Current Frontend (Already Updated in Previous Session)
- Form has `submission_type` selector in `photo_requirements` FormGroup
- Frontend already sends submission_type in photo_requirements object:
  ```typescript
  {
    photo_requirements: {
      submission_type: 'photo' | 'video' | 'either',
      angle: string,
      distance: string,
      // ... other photo settings
    }
  }
  ```

### Frontend Integration (No Changes Required)
- Backend will automatically extract submission_type from photo_requirements
- Frontend doesn't need to change because:
  1. Form structure remains the same (submission_type in photo_requirements FormGroup)
  2. Backend handles extraction and storage to separate column
  3. When loading, backend returns submission_type at item level (merged with photo_requirements)

## Database Backward Compatibility

The refactored backend maintains compatibility across database versions:

| Database Version | Behavior |
|---|---|
| **Old DB** (no submission_type, video_requirements, sample_videos columns) | ✓ submission_type kept in photo_requirements JSON |
| **Transition** (has submission_type column only) | ✓ submission_type stored in column, removed from JSON |
| **Full New DB** (all 3 columns added) | ✓ submission_type, video_requirements, sample_videos all in columns |

## Data Flow

### Creating/Updating a Template

```
Frontend Form (photo_requirements.submission_type)
    ↓
Backend createTemplate() / updateTemplate()
    ├─ Detects which columns exist
    ├─ Extracts submission_type from photo_requirements
    ├─ Removes from JSON if column exists (no duplication)
    └─ INSERT with appropriate columns
        ↓
    Database
        ├─ submission_type ENUM column (if exists)
        ├─ photo_requirements JSON (without submission_type if column exists)
        ├─ video_requirements JSON (with submission_time_seconds, max_video_duration_seconds)
        └─ sample_videos JSON (video metadata array)
```

### Reading a Template

```
Database
    ├─ submission_type ENUM column (if exists)
    ├─ photo_requirements JSON
    ├─ video_requirements JSON
    └─ sample_videos JSON
        ↓
Backend getTemplate()
    ├─ Detects which columns exist
    ├─ SELECTs appropriate columns
    ├─ Extracts submission_type from column (or JSON fallback)
    └─ Returns to frontend
        ↓
Frontend (merges into photo_requirements if needed)
```

## Testing Checklist

- [ ] Execute all 3 migrations in order (submission_type → sample_videos → video_requirements)
- [ ] Create new template with submission_type='video', submission_time_seconds=30
- [ ] Verify template saves and loads correctly
- [ ] Verify submission_type displays in UI selector
- [ ] Verify submission_time_seconds appears in Video Requirements section
- [ ] Update template and verify changes persist
- [ ] Test with older data (if available) - ensure backward compatibility
- [ ] Check database directly: `SELECT id, submission_type, photo_requirements FROM checklist_items LIMIT 5`
  - submission_type should be in column
  - photo_requirements should NOT contain submission_type

## Related Files
- Database Migration Scripts: `database/migrations/add_submission_type_column.sql`, `add_sample_videos_column.sql`, `add_video_requirements_column.sql`
- Backend API: `backend/api/photo-checklist/photo-checklist-config.php` ✓ Updated
- Frontend Service: `src/app/services/photo-checklist-config.service.ts` (existing types sufficient)
- Frontend Component: `src/app/components/checklist-template-editor.component.ts` (UI already updated)

## Performance Impact

- **Positive**: 
  - submission_type now indexed (faster filtering/sorting)
  - Simpler database queries (no JSON_EXTRACT needed for submission_type)
  - Clearer schema semantics
  
- **Neutral**:
  - No additional storage or I/O cost
  - Backward compatibility maintained during transition

## Future Enhancements

1. Add submission_type-specific settings (e.g., max_retries for photo vs video)
2. Add instance-level enforcement: Show only relevant upload buttons based on submission_type
3. Add countdown timer for submission_time_seconds limit
4. Add video duration validation against max_video_duration_seconds
