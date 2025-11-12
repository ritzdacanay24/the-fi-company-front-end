# Document Control Display Format

## Overview
The system displays document control numbers in the format: **QA-FRM-373, Rev 1.00** (or simplified as **Rev 1**, **Rev 2**, etc.)

## Backend Changes

### What Was Modified
Updated `backend/api/photo-checklist/photo-checklist-config.php` to include quality document metadata when fetching templates.

### getTemplate() Method
```php
$sql = "SELECT ct.*,
               qd.id as qd_id,
               qd.document_number,
               qd.title as qd_title,
               qr.id as qr_id,
               qr.revision_number,
               qr.description as qr_description
        FROM checklist_templates ct
        LEFT JOIN quality_documents qd ON qd.id = ct.quality_document_id
        LEFT JOIN quality_revisions qr ON qr.id = ct.quality_revision_id
        WHERE ct.id = ? AND ct.is_active = 1";
```

### Response Format
```json
{
  "id": 123,
  "name": "Battery Installation Checklist",
  "version": "1.1",
  "quality_document_metadata": {
    "document_id": 45,
    "revision_id": 67,
    "document_number": "QA-CHK-201",
    "revision_number": 2,
    "title": "Battery Installation Checklist",
    "version_string": "QA-CHK-201, Rev 2"
  },
  "items": [...]
}
```

**If no document control is set:**
```json
{
  "id": 123,
  "name": "Battery Installation Checklist",
  "quality_document_metadata": null,
  "items": [...]
}
```

## Frontend Display

### Template Editor Header
The document control number displays as a badge next to the version:

```html
<p class="text-muted mb-0" *ngIf="editingTemplate">
  {{editingTemplate.name}} - Version {{editingTemplate.version}}
  
  <!-- Document Control Badge (only shows if linked to quality document) -->
  <span *ngIf="editingTemplate.quality_document_metadata" 
        class="badge bg-info text-dark ms-2">
    <i class="mdi mdi-file-document me-1"></i>
    {{editingTemplate.quality_document_metadata.document_number}}, 
    Rev {{editingTemplate.quality_document_metadata.revision_number}}
  </span>
</p>
```

### Visual Example

**Before Document Control:**
```
Battery Installation Checklist - Version 1.1
```

**After Document Control:**
```
Battery Installation Checklist - Version 1.1  [📄 QA-CHK-201, Rev 2]
                                                 ^^^^^^^^^^^^^^^^^^^^
                                                 Blue info badge
```

## Document Number Formats

### Prefix Types
The system supports different document prefixes based on department/category:

| Prefix | Description | Example |
|--------|-------------|---------|
| QA-FRM | Quality Forms | QA-FRM-373, Rev 1 |
| QA-CHK | Quality Checklists | QA-CHK-201, Rev 2 |
| QA-PROC | Quality Procedures | QA-PROC-105, Rev 3 |
| ENG-WI | Engineering Work Instructions | ENG-WI-042, Rev 1 |
| OPS-SOP | Operations SOPs | OPS-SOP-018, Rev 5 |

### Revision Format
- **Simple integer format:** Rev 1, Rev 2, Rev 3
- **Not decimal format:** ~~Rev 1.00, Rev 1.01~~ (avoided for simplicity)

**Why Simple Format?**
- Easier to understand: "Rev 2" vs "Rev 1.01"
- Clearer progression: 1 → 2 → 3 vs 1.00 → 1.01 → 1.10 → 2.00
- Matches existing quality_revisions table structure
- Standard in most quality management systems

## Template List Display (Optional Enhancement)

You can also show document numbers in the template manager list:

```html
<td>
  <div class="fw-bold">{{template.name}}</div>
  <small class="text-muted" *ngIf="template.quality_document_metadata">
    <i class="mdi mdi-file-document me-1"></i>
    {{template.quality_document_metadata.version_string}}
  </small>
</td>
```

**Visual:**
```
┌─────────────────────────────────────────┐
│ Template Name                           │
├─────────────────────────────────────────┤
│ Battery Installation Checklist          │
│ 📄 QA-CHK-201, Rev 2                    │
│                                         │
│ Final Assembly Inspection               │
│ 📄 QA-CHK-189, Rev 1                    │
│                                         │
│ Wire Harness Testing                    │
│ (No document control assigned)          │
└─────────────────────────────────────────┘
```

## API Response Examples

### Example 1: Template with Document Control
```json
GET /api/photo-checklist-config.php?request=template&id=123

Response:
{
  "id": 123,
  "name": "Battery Safety Inspection (v1.1)",
  "category": "quality_control",
  "version": "1.1",
  "quality_document_id": 45,
  "quality_revision_id": 67,
  "quality_document_metadata": {
    "document_id": 45,
    "revision_id": 67,
    "document_number": "QA-CHK-201",
    "revision_number": 2,
    "title": "Battery Safety Inspection",
    "version_string": "QA-CHK-201, Rev 2"
  },
  "items": [
    {
      "id": 1,
      "title": "Check battery voltage",
      "description": "Measure voltage with multimeter...",
      "is_required": true,
      "order_index": 1
    }
  ]
}
```

### Example 2: Template without Document Control
```json
GET /api/photo-checklist-config.php?request=template&id=124

Response:
{
  "id": 124,
  "name": "New Checklist Template",
  "category": "inspection",
  "version": "1.0",
  "quality_document_id": null,
  "quality_revision_id": null,
  "quality_document_metadata": null,
  "items": [...]
}
```

## Workflow Integration

### 1. Create New Template
- User creates template
- System calls `CreateChecklistDocument` stored procedure
- Document number assigned: **QA-CHK-202**
- Revision 1 created
- Template displays: "Template Name - Version 1.0 [📄 QA-CHK-202, Rev 1]"

### 2. Edit Template (Create Revision)
- User edits template with document number
- Change detection shows diff
- User provides revision description
- System calls `CreateChecklistRevision` stored procedure
- New revision created: **Rev 2**
- Template displays: "Template Name - Version 1.1 [📄 QA-CHK-202, Rev 2]"

### 3. View Template
- Backend fetches template with JOINs to quality_documents and quality_revisions
- Returns `quality_document_metadata` object
- Frontend displays badge if metadata exists

## CSS Styling

The badge uses Bootstrap classes:
```html
<span class="badge bg-info text-dark ms-2">
  <i class="mdi mdi-file-document me-1"></i>
  QA-CHK-201, Rev 2
</span>
```

**Breakdown:**
- `badge` - Bootstrap badge component
- `bg-info` - Light blue background
- `text-dark` - Dark text for contrast
- `ms-2` - Margin start (left spacing)
- `mdi mdi-file-document` - Material Design Icons document icon
- `me-1` - Margin end (spacing after icon)

## Testing the Display

### Step 1: Run Migration
```bash
mysql -u root -p eyefi < backend/database/migrations/integrate_checklist_with_quality_documents.sql
```

### Step 2: Create Test Template
1. Create new template: "Test Battery Inspection"
2. Add 3-5 items
3. Save template
4. Verify database:
   ```sql
   SELECT ct.id, ct.name, ct.quality_document_id, 
          qd.document_number, qr.revision_number
   FROM checklist_templates ct
   LEFT JOIN quality_documents qd ON qd.id = ct.quality_document_id
   LEFT JOIN quality_revisions qr ON qr.id = ct.quality_revision_id
   ORDER BY ct.id DESC LIMIT 1;
   ```

### Step 3: Check API Response
```bash
# Replace 123 with your template ID
curl http://localhost/backend/api/photo-checklist/photo-checklist-config.php?request=template&id=123
```

**Expected response includes:**
```json
{
  "quality_document_metadata": {
    "document_number": "QA-CHK-XXX",
    "revision_number": 1,
    "version_string": "QA-CHK-XXX, Rev 1"
  }
}
```

### Step 4: View in UI
1. Open template in editor
2. Check header shows: **[📄 QA-CHK-XXX, Rev 1]** badge
3. Badge should be blue/cyan color
4. Should appear next to version number

### Step 5: Edit and Create Revision
1. Edit the template (add 2 items)
2. Save → Shows change detection dialog
3. Enter revision description
4. Save → Creates Rev 2
5. Reopen template
6. Verify header shows: **[📄 QA-CHK-XXX, Rev 2]**

## Troubleshooting

### Badge not showing
**Check:**
1. Template has `quality_document_id` in database
2. API response includes `quality_document_metadata`
3. Browser console for errors
4. Check network tab for API response

### Document number is null
**Check:**
1. Migration script ran successfully
2. Stored procedures exist: `SHOW PROCEDURE STATUS WHERE Db = 'eyefi'`
3. `quality_documents` table has records
4. Foreign keys are set correctly

### Wrong revision number
**Check:**
1. `quality_revisions.is_current = 1` for current revision
2. Template's `quality_revision_id` points to correct revision
3. Run query:
   ```sql
   SELECT qr.* 
   FROM quality_revisions qr
   JOIN checklist_templates ct ON ct.quality_revision_id = qr.id
   WHERE ct.id = [YOUR_TEMPLATE_ID];
   ```

## Future Enhancements

### 1. Show Status Badge
```html
<span class="badge bg-warning" *ngIf="editingTemplate.quality_document_metadata?.status === 'pending'">
  Pending Approval
</span>
```

### 2. Add Revision History Button
```html
<button class="btn btn-sm btn-outline-secondary" 
        *ngIf="editingTemplate.quality_document_metadata"
        (click)="viewRevisionHistory()">
  <i class="mdi mdi-history me-1"></i>
  Revision History
</button>
```

### 3. Show Approval Status
```html
<small class="text-muted" *ngIf="editingTemplate.quality_document_metadata">
  Approved by: {{editingTemplate.quality_document_metadata.approved_by}}
  on {{editingTemplate.quality_document_metadata.approved_at | date}}
</small>
```

## Summary

✅ Backend modified to return document control metadata  
✅ Frontend already configured to display the badge  
✅ Format: "QA-CHK-201, Rev 2" (simple integer revisions)  
✅ Badge only shows when template linked to quality document  
✅ Blue info badge with document icon  
✅ Positioned next to version number in header  

The system is ready to display document control numbers as soon as templates are linked to quality documents via the integration!
