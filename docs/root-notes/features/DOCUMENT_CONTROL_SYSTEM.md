# Checklist Template Document Control System

## Overview

This system integrates **checklist templates** with the existing **quality documents system**, supporting formats like:
- **QA-FRM-373, Rev 1** (Quality Forms)
- **QA-CHK-245, Rev 2** (Quality Checklists)  
- **ENG-WI-089, Rev 3** (Work Instructions)

**Uses existing tables** - no new tables needed!

**Complies with**: ISO 9001, AS9100, FDA 21 CFR Part 11, and other quality standards

---

## Architecture (Using Existing System)

### 1. **Quality Documents** (`quality_documents`) - Already Exists ✅
One record per document family
```
QA-FRM-373 → Points to current active revision (e.g., Rev 2)
```

### 2. **Quality Revisions** (`quality_revisions`) - Already Exists ✅
Multiple records per document (full revision history)
```
QA-FRM-373, Rev 1 (superseded)
QA-FRM-373, Rev 2 (approved, current)
QA-FRM-373, Rev 3 (draft)
```

### 3. **Quality Document Approvals** (`quality_document_approvals`) - Already Exists ✅
Multi-level approval workflow

### 4. **Checklist Templates** (`checklist_templates`) - Enhanced ✅
Now linked to quality documents via foreign keys:
- `quality_document_id` → Links to quality_documents
- `quality_revision_id` → Links to quality_revisions

---

## Document Number Format

### Standard Format (Already in Use)
```
[PREFIX]-[SEQUENCE]
QA-FRM-373
```

### Revision Format (Simple - Already in Use)
```
Rev 1, Rev 2, Rev 3
```

- **Integer revisions**: Simple incremental numbers
- **No decimals needed**: Easier to understand

---

## Workflow

### Creating a New Checklist Document

```sql
-- Use the stored procedure
CALL CreateChecklistDocument(
    'QA-CHK',                      -- prefix
    'Pre-Deployment Checklist',    -- title
    'Checklist for pre-deployment inspection',  -- description
    'QA',                          -- department
    'quality_control',             -- category
    789,                           -- template_id (from checklist_templates)
    'John Doe',                    -- created_by
    'Initial release',             -- revision_description
    @doc_id,                       -- OUT: document_id
    @doc_number,                   -- OUT: document_number (QA-CHK-201)
    @rev_id                        -- OUT: revision_id
);

-- Returns:
-- @doc_number = 'QA-CHK-201'
-- @doc_id = 15
-- @rev_id = 45
```

### Creating a New Revision (When Changes Made)

```sql
-- When user saves changes to QA-CHK-201:
CALL CreateChecklistRevision(
    15,                            -- document_id
    890,                           -- new template_id
    'Added 3 new inspection steps',  -- revision_description
    'Added 3 items, modified 2 items',  -- changes_summary
    3,                             -- items_added
    0,                             -- items_removed
    2,                             -- items_modified
    '{...}',                       -- changes_detail (JSON from change detection)
    'John Doe',                    -- created_by
    @rev_id,                       -- OUT: revision_id
    @rev_number                    -- OUT: revision_number (2)
);

-- Returns:
-- @rev_number = 2  (incremented from 1)
-- @rev_id = 46
```

### Approving a Revision

```sql
-- Approve the revision
CALL ApproveChecklistRevision(
    46,              -- revision_id
    'Jane Manager'   -- approved_by
);

-- This will:
-- 1. Mark revision as 'approved'
-- 2. Update document status to 'approved'
-- 3. Mark older revisions as 'superseded'
```

---

## Integration with Checklist Templates

### Database Schema

```
quality_documents (master table - already exists)
├── document_number: QA-CHK-201
├── current_revision: 2
├── status: approved
└── department: QA

quality_revisions (history - already exists)
├── document_id → quality_documents.id
├── revision_number: 2
├── template_id → checklist_templates.id
├── items_added: 3
├── items_removed: 0
├── items_modified: 2
├── changes_detail: JSON (from change detection)
├── status: approved
└── is_current: 1

checklist_templates (enhanced with new fields)
├── id: 890
├── name: "Pre-Deployment Checklist"
├── quality_document_id → quality_documents.id
├── quality_revision_id → quality_revisions.id
└── items: [...]

quality_document_approvals (approval workflow - already exists)
├── document_id → quality_documents.id
├── revision_id → quality_revisions.id
├── approval_status: approved
└── approver_name: "Jane Manager"
```

### New Fields Added to Existing Tables

**checklist_templates:**
- `quality_document_id INT` - Links to quality_documents
- `quality_revision_id INT` - Links to quality_revisions

**quality_revisions:**
- `template_id INT` - Links to checklist_templates
- `items_added INT` - Count from change detection
- `items_removed INT` - Count from change detection  
- `items_modified INT` - Count from change detection
- `changes_detail JSON` - Full change details

---

## Frontend Integration

### Modified Save Flow

```typescript
// Current flow with document control:
1. User edits template
2. Click Save
3. Show change detection modal ✅
4. User enters:
   - Revision description (required)
   - Reason for change (optional)
5. System:
   - Checks if template has quality_document_id
   - If YES: Create new revision (Rev 2, 3, etc.)
   - If NO: Create new document + Rev 1
6. Show status: "Created QA-CHK-201, Rev 2 (Pending Approval)"
```

### TypeScript Interface

```typescript
interface ChecklistDocumentInfo {
  // From quality_documents
  quality_document_id: number;
  document_number: string;      // "QA-CHK-201"
  current_revision: number;     // 2
  document_status: string;      // "approved"
  
  // From quality_revisions
  quality_revision_id: number;
  revision_description: string;
  items_added: number;
  items_removed: number;
  items_modified: number;
}
```

---

## Benefits

### For Quality Department
- ✅ Proper revision control (QA-CHK-201, Rev 2)
- ✅ Approval workflow (draft → review → approved)
- ✅ **Uses existing system** - no retraining needed
- ✅ ISO 9001 / AS9100 compliance
- ✅ Complete revision history

### For Business
- ✅ **No new tables** - extends what you have
- ✅ **Already implemented** - approval workflow exists
- ✅ **Simple revisions** - integers, not decimals (Rev 1, 2, 3)
- ✅ **Scalable** - works for all document types
- ✅ **Minimal changes** - just add foreign keys

### For Users
- ✅ Clear document numbers (QA-CHK-201 vs "Template #79")
- ✅ Easy to reference ("Use QA-CHK-201, Rev 2")
- ✅ See what changed between revisions
- ✅ Know when it was approved and by whom

---

## Implementation Steps

### Phase 1: Database Setup ✅
```bash
# Run the integration migration
mysql -u root -p eyefi < backend/database/migrations/integrate_checklist_with_quality_documents.sql
```

This will:
- ✅ Add `quality_document_id` and `quality_revision_id` to checklist_templates
- ✅ Add `template_id` and change tracking fields to quality_revisions
- ✅ Create stored procedures for checklist operations
- ✅ Create views for easy querying

### Phase 2: Backend API (Already Created) ✅
Use existing quality documents API or create thin wrapper

### Phase 3: Frontend Integration
1. Update template editor to call document control procedures
2. Display document number and revision in UI
3. Show revision history
4. Link to approval workflow

### Phase 4: Migration (Optional)
Migrate existing templates to document control system

---

## Example: Complete Workflow

### User Story: Quality Manager Updates QA-CHK-201

```
1. User opens QA-CHK-201, Rev 1 (current approved version)
   - Template ID: 789
   - Linked to quality_document_id: 15

2. User adds 3 new inspection steps

3. User clicks "Save"

4. System detects changes:
   ✓ 3 items added
   ✓ 2 items modified (description changed)

5. Modal shows:
   "Changes Detected for QA-CHK-201, Rev 1"
   
   [Required]
   Revision Description: "Added 3 new LED inspection steps"
   
   [Optional]
   Reason for Change: "Customer requirement per ECN-2025-045"
   
   [Button] Create Revision (Pending Approval)
   
6. System calls stored procedure:
   CALL CreateChecklistRevision(
       15,              -- document_id (QA-CHK-201)
       890,             -- new template_id
       'Added 3 new...',
       'Added 3 items, modified 2',
       3, 0, 2,         -- counts
       '{...}',         -- JSON details
       'John Doe',
       @rev_id,
       @rev_number
   );
   
7. System creates:
   - New template (ID: 890)
   - Quality revision: Rev 2 (status: draft)
   - Updates checklist_templates foreign keys
   
8. Shows: "Created QA-CHK-201, Rev 2 (Pending Approval)"

9. Manager reviews and approves:
   CALL ApproveChecklistRevision(46, 'Jane Manager');
   
10. Status changes:
    - Revision 2: draft → approved
    - Document: approved
    - Revision 1: approved → superseded
    
11. Users now see: QA-CHK-201, Rev 2 (Active)
```

---

## Summary

### **What We're Using:**

✅ **Your existing `quality_documents` system** - Already built, already works  
✅ **Simple integer revisions** - Rev 1, 2, 3 (not 1.00, 1.01)  
✅ **Existing approval workflow** - quality_document_approvals table  
✅ **Just add foreign keys** - Link checklist_templates to quality_documents  

### **What We're NOT Doing:**

❌ **NOT creating new document_control tables** - Redundant  
❌ **NOT using decimal revisions (1.00, 1.01)** - Unnecessarily complex  
❌ **NOT building new approval system** - You already have one  

### **Migration Created:**

📄 **`integrate_checklist_with_quality_documents.sql`** - Run this!
- Adds `quality_document_id` to checklist_templates
- Adds `quality_revision_id` to checklist_templates
- Adds change tracking fields to quality_revisions
- Creates stored procedures for checklist operations
- Creates views for easy querying

### **Next Steps:**

1. **Run the migration** ✅
   ```bash
   mysql -u root -p eyefi < backend/database/migrations/integrate_checklist_with_quality_documents.sql
   ```

2. **Update frontend** to call the stored procedures:
   - `CreateChecklistDocument()` - For new templates
   - `CreateChecklistRevision()` - When saving changes
   - `ApproveChecklistRevision()` - For approval

3. **Test the workflow** with a real checklist

4. **Extend to other document types** if needed

---

## Key Advantages of This Approach

1. **Zero Learning Curve** - Uses system you're already building
2. **Simple Revisions** - Rev 1, 2, 3 (easy to understand)
3. **No Migration Complexity** - Just add FK columns
4. **Approval Workflow Exists** - Already have quality_document_approvals
5. **Consistent Across Company** - All docs use same system

**This is the right way to do it!** 🎯
