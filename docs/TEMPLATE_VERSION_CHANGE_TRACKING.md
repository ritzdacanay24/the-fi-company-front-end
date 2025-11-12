# Template Version Change Tracking System

## Overview
Intelligent system to track, display, and manage changes between template versions with automatic change detection.

---

## Components Created

### 1. **Database**
**File:** `backend/database/migrations/create_template_change_tracking.sql`
- Creates `checklist_template_changes` table
- Stores: version, change_type, change_summary, changes_json (detailed diff)
- Tracks: field updates, items added/removed/modified
- Indexed for performance (template_id, version, created_at)

### 2. **Backend - Change Tracker**
**File:** `backend/api/photo-checklist/TemplateChangeTracker.php`

**Key Methods:**
- `detectChanges($oldTemplate, $newTemplate)` - Intelligently compares templates
  - Tracks 11 metadata fields (name, description, part_number, etc.)
  - Detects item additions, removals, modifications
  - Returns structured change object with old/new values

- `generateSummary($changes)` - Creates human-readable summary
  - Example: "Updated fields: name, part_number; Added 2 item(s); Modified 1 item(s)"

- `logChange($templateId, $version, $changeType, $changes)` - Persists to DB

- `getChangeHistory($templateGroupId)` - Retrieves version history timeline

### 3. **Backend - API Endpoints**
**File:** `backend/api/photo-checklist/photo-checklist-config.php`

**New Endpoints:**
```php
GET /api?request=template_history&group_id=X
GET /api?request=template_history&template_id=X
GET /api?request=compare_templates&source_id=X&target_id=Y
```

**Integration Points:**
- `createTemplate()` - When creating new version, automatically log changes
- `updateTemplate()` - Could optionally prompt for version creation

### 4. **Frontend - Version Changes Dialog**
**File:** `src/app/pages/quality/checklist/template-editor/components/version-changes-dialog.component.ts`

**Features:**
- Shows before saving changes
- Visual diff display:
  - Field changes: old value (strikethrough) → new value (green)
  - Items added: green border, badge
  - Items removed: red border, strikethrough
  - Items modified: orange border with detailed change list
- User options:
  - ✅ **Create New Version** (recommended) - preserves history
  - ⚠️ **Update Current Version** - warns about impact
  - ❌ **Cancel** - discard changes
- Optional version notes field

### 5. **Frontend - Version History Dialog**
**File:** `src/app/pages/quality/checklist/template-editor/components/version-history-dialog.component.ts`

**Features:**
- Timeline view of all versions
- Shows:
  - Version number badge
  - "Current" indicator
  - Change type icon
  - Date (relative: "2 days ago" or absolute)
  - Change summary
- Expandable details per version:
  - Fields changed (chips)
  - Items added (green list)
  - Items removed (red list)
  - Items modified (yellow list)
- Scrollable, responsive design

### 6. **Frontend - Service Integration**
**File:** `src/app/core/api/photo-checklist-config/photo-checklist-config.service.ts`

**New Methods:**
```typescript
getTemplateHistory(groupId: number): Observable<any[]>
getTemplateVersionChanges(templateId: number): Observable<any[]>
compareTemplates(sourceId: number, targetId: number): Observable<any>
```

---

## User Workflows

### **Workflow 1: Editing Existing Template**
```
1. User opens template in editor
2. User modifies fields and/or items
3. User clicks "Save"
4. System automatically:
   - Fetches current template from database
   - Compares with edited form data
   - Calls TemplateChangeTracker.detectChanges()
5. IF changes detected:
   → Show VersionChangesDialogComponent
   → Display what changed (visual diff)
   → User chooses: Create Version | Update Current | Cancel
6. IF "Create Version" selected:
   → System auto-increments version (1.0 → 1.1)
   → Creates new template row with new template_id
   → Inherits template_group_id from parent
   → Sets parent_template_id to source template
   → Deactivates old version
   → Logs changes to checklist_template_changes table
   → Creates new checklist_items rows
7. IF "Update Current" selected:
   → Updates existing template row
   → Optionally logs modification to change tracking
```

### **Workflow 2: View Version History**
```
1. User in template manager
2. User clicks "View History" button on template row
3. Opens VersionHistoryDialogComponent
4. System:
   - Calls getTemplateHistory(template_group_id)
   - Fetches all change log entries for this template family
5. Displays timeline:
   - Newest at top
   - Current version highlighted
   - Each version shows summary
   - Expandable for detailed changes
```

### **Workflow 3: Compare Two Versions**
```
1. User selects two versions from history
2. Clicks "Compare"
3. System:
   - Calls compareTemplates(sourceId, targetId)
   - Fetches both templates
   - Runs change detection
4. Shows side-by-side or unified diff view
```

---

## Data Structures

### **Change Detection Output**
```typescript
{
  fields_changed: ['name', 'part_number', 'description'],
  field_changes: {
    name: {
      old: 'Template v1.0',
      new: 'Updated Template v1.1'
    },
    part_number: {
      old: 'WDG-123',
      new: 'WDG-124'
    }
  },
  items_added: [
    {
      title: 'New inspection step',
      order_index: 5,
      description: 'Check cable connections'
    }
  ],
  items_removed: [
    {
      title: 'Old step to remove',
      order_index: 3
    }
  ],
  items_modified: [
    {
      title: 'Existing item',
      order_index: 2,
      changes: {
        description: {
          old: 'Old description',
          new: 'Updated description'
        },
        sample_image_url: {
          old: '/uploads/old.jpg',
          new: '/uploads/new.jpg'
        }
      }
    }
  ],
  has_changes: true
}
```

### **Database Record**
```sql
INSERT INTO checklist_template_changes (
  template_id,
  version,
  change_type,
  changed_by,
  change_summary,
  changes_json,
  created_at
) VALUES (
  82,
  '1.1',
  'version_created',
  NULL,
  'Updated fields: name, part_number; Added 2 item(s); Modified 1 item(s)',
  '{"fields_changed":["name","part_number"],"items_added":[...],"items_modified":[...]}',
  CURRENT_TIMESTAMP
);
```

---

## Implementation Checklist

### **Backend:**
- [x] Create `checklist_template_changes` table migration
- [x] Create `TemplateChangeTracker.php` class
- [x] Add endpoints to `photo-checklist-config.php`
- [ ] **Integrate into `createTemplate()`** - auto-log when source_template_id provided
- [ ] **Integrate into `updateTemplate()`** - optional change detection
- [ ] Run migration on database

### **Frontend:**
- [x] Create `VersionChangesDialogComponent`
- [x] Create `VersionHistoryDialogComponent`
- [x] Add service methods to `PhotoChecklistConfigService`
- [ ] **Integrate into template editor save flow**
- [ ] **Add "View History" button to template manager**
- [ ] Add Material Dialog imports to app module
- [ ] Test complete workflow

### **User Facing:**
- [ ] Add "Version History" icon button in template manager table
- [ ] Hook up change detection on template save
- [ ] Add user preference: "Always create version on save" vs "Prompt"
- [ ] Display version badge/indicator in template editor header

---

## Benefits

### **For Users:**
✅ **Transparency** - See exactly what changed
✅ **Safety** - Review before creating new version
✅ **Audit Trail** - Complete history of all modifications
✅ **Confidence** - No fear of losing work or breaking existing workflows

### **For System:**
✅ **Automatic** - No manual change logging required
✅ **Intelligent** - Smart diff algorithm detects all changes
✅ **Structured** - JSON format allows programmatic analysis
✅ **Scalable** - Works for templates with hundreds of items

---

## Next Steps

1. **Run Database Migration**
   ```bash
   mysql -u [user] -p [database] < backend/database/migrations/create_template_change_tracking.sql
   ```

2. **Integrate Change Detection into Save Flow**
   - Modify template editor component
   - Add pre-save hook to detect changes
   - Show dialog if changes detected

3. **Add UI Buttons**
   - "View History" in template manager
   - "Compare Versions" in history dialog

4. **Test Complete Flow**
   - Edit template → save → see changes dialog
   - Create version → verify history logged
   - View history → see timeline
   - Compare versions → see differences

---

## Questions Answered

> **"Should we display the changes that were made to the user in case they want to modify what was changed?"**

**✅ Yes!** The `VersionChangesDialogComponent` displays:
- Complete list of what changed
- Before/after values for each field
- Visual diff (strikethrough old, highlighted new)
- User can review and choose to:
  - Proceed with version creation
  - Go back and modify further
  - Update current version instead
  - Cancel entirely

This gives users full transparency and control before committing changes.
