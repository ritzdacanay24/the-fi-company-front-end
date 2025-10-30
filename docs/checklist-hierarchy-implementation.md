# Checklist Item Hierarchy Implementation

## Overview
Added support for parent-child relationships in checklist items to handle scenarios where a single inspection point has multiple reference photos (e.g., row 14 with 3 images becomes 1 parent + 3 children instead of 3 separate items).

## Database Changes

### Schema Update
**File:** `database/migrations/add_hierarchy_to_checklist_items.sql`

Added two columns to `checklist_items` table:
- `parent_id` (INT NULL): References the `order_index` of the parent item
- `level` (TINYINT, default 0): Indicates hierarchy depth (0=parent, 1=child)

```sql
ALTER TABLE checklist_items
ADD COLUMN parent_id INT NULL DEFAULT NULL AFTER order_index,
ADD COLUMN level TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER parent_id,
ADD INDEX idx_parent (parent_id),
ADD INDEX idx_level (level);
```

### Data Structure
**Flat storage with hierarchy metadata:**
- Parent items: `level=0, parent_id=NULL`
- Child items: `level=1, parent_id=<parent's order_index>`

**Example:**
```
Item 14 (order_index=14, parent_id=NULL, level=0) - "Check connector alignment"
  └─ Item 14.1 (order_index=14.1, parent_id=14, level=1) - "Reference Photo 1"
  └─ Item 14.2 (order_index=14.2, parent_id=14, level=1) - "Reference Photo 2"
  └─ Item 14.3 (order_index=14.3, parent_id=14, level=1) - "Reference Photo 3"
```

## Backend Changes

### PHP API Updates
**File:** `backend/api/photo-checklist/photo-checklist-config.php`

Updated both `createTemplate()` and `updateTemplate()` to save hierarchy fields:

```php
// Now includes parent_id and level
$sql = "INSERT INTO checklist_items (
    template_id, order_index, parent_id, level, 
    title, description, photo_requirements, sample_images, is_required
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";

$stmt->execute([
    $templateId,
    $item['order_index'] ?? ($index + 1),
    $item['parent_id'] ?? null,      // ← New
    $item['level'] ?? 0,              // ← New
    $item['title'],
    // ... rest of fields
]);
```

### PDF Image Extraction
**File:** `backend/api/quality/pdf-extract-images.php`

Enhanced Y-position grouping:
- Increased tolerance from 30px to 50px
- Added detailed debug logging to show grouping decisions
- Groups images with similar Y-coordinates (same table row)

## Frontend Changes

### Service Layer
**File:** `src/app/pages/quality/checklist-template-editor/services/pdf-parser.service.ts`

Updated `ParsedChecklistItem` interface:
```typescript
interface ParsedChecklistItem {
  // Existing fields...
  
  // Hierarchy support
  children?: ParsedChecklistItem[];
  parent_id?: number;
  level?: number; // 0 = parent, 1 = child
}
```

Logic in `extractChecklistItems()`:
- Consumes `imageGroups` from backend API
- When group has multiple images: creates parent with children
- When group has single image: creates single item
- Preserves text extracted from PDF for parent items

### Component
**File:** `src/app/pages/quality/checklist-template-editor/checklist-template-editor.component.ts`

Updated form building:
```typescript
// Form includes hierarchy fields
this.fb.group({
  // ... other fields
  parent_id: [item?.parent_id || null],
  level: [item?.level || 0]
});
```

Import process (`loadParsedTemplate()`):
- Flattens parent-child structure from service
- Adds parent item first
- Then adds each child item sequentially

### Template (HTML)
Inline template shows visual hierarchy:
- Indentation: `[class.ms-4]="item.get('level')?.value === 1"`
- Border styling for children
- Different labeling: "Item X" vs "Sub-item X.Y"
- "Add Sub-item" button only on parent items

## Display Strategy

### Editor View (During Import/Edit)
- **Flat FormArray** with hierarchy metadata
- Visual indicators (indentation, borders) based on `level` field
- Sequential display: Parent followed by all children

### When Loading from Database
Items are stored flat with `parent_id` and `level`, so they can be:
1. **Displayed flat** (current approach) - easier for editing
2. **Reconstructed into tree** (if needed for specific views) - can use recursive logic

### Future Display Options

**Option A: Keep flat** (recommended for editing)
```
Item 14
  └─ Sub-item 14.1
  └─ Sub-item 14.2
  └─ Sub-item 14.3
Item 15
```

**Option B: Nested display** (better for viewing/checklist execution)
```
Item 14 [Expand/Collapse]
  ├─ Reference Photo 1
  ├─ Reference Photo 2
  └─ Reference Photo 3
Item 15
```

To implement Option B, add a reconstruction method:
```typescript
private reconstructHierarchy(flatItems: ChecklistItem[]): ChecklistItem[] {
  const itemMap = new Map<number, ChecklistItem>();
  const rootItems: ChecklistItem[] = [];
  
  // First pass: create map
  flatItems.forEach(item => {
    item.children = [];
    itemMap.set(item.order_index, item);
  });
  
  // Second pass: build tree
  flatItems.forEach(item => {
    if (item.level === 0 || !item.parent_id) {
      rootItems.push(item);
    } else {
      const parent = itemMap.get(item.parent_id);
      if (parent) {
        parent.children!.push(item);
      }
    }
  });
  
  return rootItems;
}
```

## Testing Checklist

- [ ] **Run migration**: Execute `add_hierarchy_to_checklist_items.sql`
- [ ] **Import PDF**: Use a PDF where row 14 has 3 images
- [ ] **Verify grouping**: Check PHP logs to see if images grouped correctly
- [ ] **Check display**: Subitems should show indented with "Sub-item" label
- [ ] **Save template**: Ensure no errors
- [ ] **Reload template**: Verify hierarchy persists after page refresh
- [ ] **Inspect database**: Check that `parent_id` and `level` are saved

## Benefits

✅ **Maintains data integrity** - Parent-child relationships preserved
✅ **Flexible display** - Can show flat or nested based on context
✅ **Easy querying** - Simple WHERE clauses (e.g., `WHERE level=0` for parents)
✅ **No complex joins** - Flat structure is efficient
✅ **Backward compatible** - Existing items have `level=0, parent_id=NULL`
✅ **Scalable** - Can extend to deeper hierarchies if needed (level=2, 3, etc.)

## Next Steps

1. **Run the migration** to add columns
2. **Test PDF import** with multi-image rows
3. **Verify persistence** by reloading saved templates
4. **Consider UI enhancements**:
   - Expand/collapse for parent items
   - Drag-drop for reordering within parent
   - Visual connection lines (tree view)
