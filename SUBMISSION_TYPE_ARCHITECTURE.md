# Submission Type Architecture - CORRECTED

## Problem Clarified
**User Requirement**: `submission_type` should be a **SEPARATE ENUM COLUMN** in the database, NOT nested in any JSON.

## Database Schema (3 Separate Columns)

```sql
-- 1. ENUM Column (separate, not nested)
ALTER TABLE checklist_items 
ADD COLUMN submission_type ENUM('photo','video','either') DEFAULT 'photo' AFTER photo_requirements;

-- 2. JSON Column (for photo settings)
-- Existing: photo_requirements JSON
-- Fields: angle, distance, lighting, focus, min_photos, max_photos, picture_required
-- NO submission_type in this JSON

-- 3. JSON Column (for video settings)  
ALTER TABLE checklist_items 
ADD COLUMN video_requirements JSON DEFAULT NULL;
-- Fields: submission_time_seconds, max_video_duration_seconds

-- 4. JSON Column (for sample videos)
ALTER TABLE checklist_items 
ADD COLUMN sample_videos JSON DEFAULT NULL;
-- Fields: Array of video objects
```

## Frontend Form Structure

```typescript
// TOP-LEVEL fields in each checklist item
{
  id: number,
  title: string,
  description: string,
  order_index: number,
  level: number,
  parent_id: number | null,
  
  // ✅ TOP-LEVEL: Separate ENUM column
  submission_type: 'photo' | 'video' | 'either',
  
  // ✅ TOP-LEVEL: submission time limit
  submission_time_seconds: number | null,
  
  // Photo settings (FormGroup)
  photo_requirements: {
    angle: string,
    distance: string,
    lighting: string,
    focus: string,
    min_photos: number,
    max_photos: number,
    picture_required: boolean,
    max_video_duration_seconds: number  // Video setting, stored here for UI convenience
  },
  
  // Sample images and videos
  sample_images: SampleImage[],
  sample_videos: SampleVideo[]
}
```

## Backend Data Flow

### On CREATE/UPDATE (Writing to Database)

1. **Frontend sends FormData**:
   ```typescript
   {
     submission_type: 'photo',           // Top-level
     photo_requirements: {...},          // JSON
     submission_time_seconds: 30,        // Top-level
     ...
   }
   ```

2. **Backend normalizes before INSERT**:
   ```php
   // Extract submission_type (top-level in frontend form)
   $submissionType = $item['submission_type'] ?? 'photo';
   
   // Ensure photo_requirements doesn't have submission_type
   if (isset($photoRequirements['submission_type'])) {
     unset($photoRequirements['submission_type']);
   }
   
   // Build video_requirements from submission_time_seconds
   $videoRequirements = [];
   if ($item['submission_time_seconds'] !== null) {
     $videoRequirements['submission_time_seconds'] = (int)$item['submission_time_seconds'];
   }
   if (isset($photoRequirements['max_video_duration_seconds'])) {
     $videoRequirements['max_video_duration_seconds'] = (int)$photoRequirements['max_video_duration_seconds'];
   }
   
   // Dynamic SQL construction
   $insertColumns = ['template_id', 'order_index', ..., 'submission_type', 'photo_requirements', 'video_requirements', 'sample_videos'];
   $insertValues = ['?', '?', ..., '?', '?', '?', '?'];
   $params = [..., $submissionType, json_encode($photoRequirements), json_encode($videoRequirements), json_encode($sampleVideos)];
   ```

3. **Database stores**:
   ```
   submission_type:       ENUM column        ← 'photo' (separate!)
   photo_requirements:    JSON               ← {angle, distance, lighting, focus, min_photos, max_photos, picture_required}
   video_requirements:    JSON               ← {submission_time_seconds, max_video_duration_seconds}
   sample_videos:         JSON               ← [...video objects...]
   ```

### On READ (Loading from Database)

1. **Backend SELECT with column detection**:
   ```php
   SHOW COLUMNS FROM checklist_items LIKE 'submission_type';
   $hasSubmissionTypeColumn = (bool)$result->rowCount();
   
   $selectClause = 'SELECT id, title, submission_type, photo_requirements, video_requirements, sample_videos FROM checklist_items';
   
   // Fetch rows
   foreach ($rows as $row) {
     $item['submission_type'] = $row['submission_type'];  // From ENUM column
     $item['photo_requirements'] = json_decode($row['photo_requirements'], true);  // No submission_type in JSON
     $item['video_requirements'] = json_decode($row['video_requirements'], true);
     $item['sample_videos'] = json_decode($row['sample_videos'], true);
     
     // Extract convenience field for frontend
     if (isset($item['video_requirements']['submission_time_seconds'])) {
       $item['submission_time_seconds'] = $item['video_requirements']['submission_time_seconds'];
     }
   }
   ```

2. **API Response** (sent to frontend):
   ```json
   {
     "id": 1,
     "submission_type": "photo",
     "photo_requirements": {
       "angle": "front",
       "distance": "medium",
       "lighting": "bright",
       "focus": "",
       "min_photos": 1,
       "max_photos": 5,
       "picture_required": true,
       "max_video_duration_seconds": 30
     },
     "video_requirements": {
       "submission_time_seconds": 60,
       "max_video_duration_seconds": 30
     },
     "submission_time_seconds": 60,
     "sample_videos": []
   }
   ```

3. **Frontend receives and populates form**:
   ```typescript
   item.submission_type = apiResponse.submission_type;  // ✅ Top-level
   item.photo_requirements = apiResponse.photo_requirements;
   item.submission_time_seconds = apiResponse.submission_time_seconds;
   ```

## UI Behavior

1. **Submission Type Selector** (top-level, not nested):
   - Radio buttons bound to `item.get('submission_type')`
   - Dynamically shows/hides Photo and Video sections
   - Values: 'photo', 'video', 'either'

2. **Photo Requirements Section**:
   - Shows when: submission_type = 'photo' OR 'either'
   - Controls: angle, distance, lighting, focus, min_photos, max_photos, picture_required
   - Also contains: max_video_duration_seconds

3. **Video Requirements Section**:
   - Shows when: submission_type = 'video' OR 'either'
   - Controls: max_video_duration_seconds (top-level in photo_requirements FormGroup)
   - Controls: submission_time_seconds (top-level item field)

## Key Points (NO More Confusion!)

✅ **Database**: `submission_type` = Separate ENUM column  
✅ **Database**: `photo_requirements` = JSON (angle, distance, lighting, focus, min_photos, max_photos, picture_required)  
✅ **Database**: `video_requirements` = JSON (submission_time_seconds, max_video_duration_seconds)  
✅ **Database**: `sample_videos` = JSON (array of video objects)  

✅ **Frontend Form**: All top-level at item level  
✅ **Frontend Template**: Reads `item.get('submission_type')` (not nested)  
✅ **Backend**: Extracts submission_type and normalizes JSON before storage  
✅ **Backend**: Returns merged response for convenience  

**This is the CORRECT, clear architecture.**
