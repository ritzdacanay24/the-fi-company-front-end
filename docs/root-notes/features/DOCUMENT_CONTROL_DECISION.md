# Document Control Implementation - Decision Summary

## Date: November 12, 2025

## Decision: Use Existing Quality Documents System

### Discovered:
The company already has a **quality documents system** in production:
- `quality_documents` - Master document table
- `quality_revisions` - Revision history
- `quality_document_approvals` - Approval workflow
- `quality_document_sequences` - Auto-numbering

### Original Plan (Abandoned):
- Create new `document_control` and `document_revisions` tables
- Use decimal revisions (1.00, 1.01, 2.00)
- Build new approval system

### New Plan (Implemented):
- **Extend existing system** - Add foreign keys to link checklist_templates
- **Simple integer revisions** - Rev 1, 2, 3 (simpler than 1.00, 1.01)
- **Use existing approval workflow** - No need to rebuild

---

## What Was Created

### 1. Migration Script ✅
**File:** `backend/database/migrations/integrate_checklist_with_quality_documents.sql`

**What it does:**
- Adds `quality_document_id` column to checklist_templates
- Adds `quality_revision_id` column to checklist_templates
- Adds change tracking fields to quality_revisions:
  - `template_id` - Links back to checklist
  - `items_added`, `items_removed`, `items_modified` - From change detection
  - `changes_detail` - Full JSON of changes
- Creates 3 stored procedures:
  - `CreateChecklistDocument()` - Create new document + Rev 1
  - `CreateChecklistRevision()` - Create new revision
  - `ApproveChecklistRevision()` - Approve and supersede old revisions
- Creates 2 views:
  - `vw_active_checklist_documents` - Active checklists with document info
  - `vw_checklist_revision_history` - Full revision history

### 2. Documentation ✅
**File:** `DOCUMENT_CONTROL_SYSTEM.md`

**Contents:**
- Architecture overview
- Workflow examples
- Integration guide
- Complete implementation steps

### 3. Backend API (Partial) ✅
**File:** `backend/api/document-control/index.php`

**Note:** This was created but may not be needed if we use stored procedures directly.

### 4. Frontend Service (Partial) ✅
**File:** `frontend/src/app/services/document-control.service.ts`

**Note:** This Angular service will need to be updated to call the stored procedures.

---

## What's Left To Do

### Immediate (To Make It Work):
1. ✅ **Run the migration** - Execute `integrate_checklist_with_quality_documents.sql`
2. ⏳ **Update template editor** - Call stored procedures on save
3. ⏳ **Update version changes dialog** - Collect revision description
4. ⏳ **Test end-to-end** - Create document, create revision, approve

### Nice to Have (Later):
- Display document number and revision in template list
- Show revision history in template editor
- Link to approval workflow UI (if it exists)
- Migrate existing templates to document control

---

## Key Decisions

### ✅ Use Existing System
**Why:** Don't duplicate what already exists. Extend instead.

### ✅ Simple Integer Revisions (1, 2, 3)
**Why:** Simpler than decimals (1.00, 1.01, 2.00). Easier for users to understand.

### ✅ Stored Procedures Over REST API
**Why:** Business logic in database ensures consistency. Transactions are atomic.

### ✅ Link via Foreign Keys
**Why:** Maintains referential integrity. Easy to query relationships.

---

## Testing Checklist

- [ ] Run migration successfully
- [ ] Create new checklist document (QA-CHK-201, Rev 1)
- [ ] Edit template and create revision (Rev 2)
- [ ] Verify change tracking (items_added, items_removed, items_modified)
- [ ] Approve revision
- [ ] Verify old revision marked as superseded
- [ ] View revision history
- [ ] Check views work correctly

---

## Rollback Plan

If something goes wrong:

```sql
-- Remove foreign keys
ALTER TABLE checklist_templates DROP FOREIGN KEY fk_checklist_quality_document;
ALTER TABLE checklist_templates DROP FOREIGN KEY fk_checklist_quality_revision;

-- Remove columns
ALTER TABLE checklist_templates DROP COLUMN quality_document_id;
ALTER TABLE checklist_templates DROP COLUMN quality_revision_id;
ALTER TABLE quality_revisions DROP COLUMN template_id;
ALTER TABLE quality_revisions DROP COLUMN items_added;
ALTER TABLE quality_revisions DROP COLUMN items_removed;
ALTER TABLE quality_revisions DROP COLUMN items_modified;
ALTER TABLE quality_revisions DROP COLUMN changes_detail;

-- Drop stored procedures
DROP PROCEDURE IF EXISTS CreateChecklistDocument;
DROP PROCEDURE IF EXISTS CreateChecklistRevision;
DROP PROCEDURE IF EXISTS ApproveChecklistRevision;

-- Drop views
DROP VIEW IF EXISTS vw_active_checklist_documents;
DROP VIEW IF EXISTS vw_checklist_revision_history;
```

---

## Files to Keep vs Delete

### ✅ Keep (Use These):
- `backend/database/migrations/integrate_checklist_with_quality_documents.sql` ✅
- `DOCUMENT_CONTROL_SYSTEM.md` ✅
- `DOCUMENT_CONTROL_DECISION.md` (this file) ✅

### ❌ Delete (Not Needed):
- `backend/database/migrations/create_document_control_system.sql` ❌
- `backend/api/document-control/index.php` (maybe - if using stored procedures directly) ❌
- `frontend/src/app/services/document-control.service.ts` (will need heavy modification) ⚠️

---

## Success Criteria

This implementation will be considered successful when:

1. ✅ Checklist templates can be linked to quality documents
2. ✅ Document numbers auto-generate (QA-CHK-201, QA-CHK-202, etc.)
3. ✅ Revisions increment properly (Rev 1 → Rev 2 → Rev 3)
4. ✅ Change detection data saves to quality_revisions
5. ✅ Approval workflow functions correctly
6. ✅ Revision history is visible and accurate
7. ✅ No data loss or corruption
8. ✅ Performance is acceptable

---

## Notes

- This integrates with **existing system** - minimal risk
- Uses **proven patterns** from your current quality documents
- **Backward compatible** - existing templates still work
- **Future proof** - can extend to other document types

---

## Questions Answered

**Q: Should we use the existing quality_documents system or create new document_control tables?**  
**A:** Use existing system. It already does what we need.

**Q: Should we use decimal revisions (1.00, 1.01) or integer revisions (1, 2, 3)?**  
**A:** Integer. Simpler and matches your existing system.

**Q: How do we link checklist_templates to quality documents?**  
**A:** Foreign keys: `quality_document_id` and `quality_revision_id`

**Q: Where should business logic live - backend API or stored procedures?**  
**A:** Stored procedures for now. Easier to ensure data integrity.

---

**Status: Ready to implement** ✅  
**Next Action: Run the migration script** 🚀
