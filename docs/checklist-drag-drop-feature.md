# Intelligent Drag-Drop for Hierarchical Checklist Items

## Overview
Enhanced the drag-drop functionality to intelligently handle parent-child relationships when reordering checklist items. Sub-items can be dragged to different parents or promoted to parent items.

## Features Implemented

### 1. Smart Reparenting
When dragging a sub-item (level=1):
- **Drop after parent item** → Becomes child of that parent
- **Drop after another sub-item** → Becomes sibling (same parent)
- **Drop at top before parent** → Automatically promoted to parent

### 2. Parent Movement
When dragging a parent item (level=0):
- **All children move with it** → Maintains family structure
- Children are repositioned right after their parent
- Order indices are recalculated automatically

### 3. Promote to Parent
- **"Promote" button** on all sub-items
- Converts sub-item to parent item (level 0)
- Automatically recalculates order indices

### 4. Visual Feedback
- **Drag handle** with hover effect and cursor change
- **Drag preview** shows what you're dragging
- **Placeholder** shows where item will drop (dashed border)
- **Smooth animations** during drag operations
- **Hierarchy indicators** (indentation, borders, icons)

## Implementation Details

### Enhanced `dropItem()` Method
```typescript
dropItem(event: CdkDragDrop<string[]>): void {
  // 1. Move item in array
  // 2. Check if child needs reparenting based on drop position
  // 3. If moving parent, also move all children
  // 4. Recalculate all order indices
}
```

**Key Logic:**
- Detects item above drop position to determine new parent
- Handles edge cases (top of list, different parents)
- Moves children as a group when parent is dragged

### `recalculateOrderIndices()` Method
```typescript
private recalculateOrderIndices(): void {
  // Parent items: 1, 2, 3, 4, ...
  // Child items: 14.1, 14.2, 14.3 (parent_id=14)
}
```

**Logic:**
- Parent items get whole numbers (1, 2, 3...)
- Child items get decimals (parent + 0.1, 0.2, 0.3...)
- Resets child counter when parent changes

### `promoteToParent()` Method
```typescript
promoteToParent(index: number): void {
  // 1. Set level = 0
  // 2. Set parent_id = null
  // 3. Recalculate all indices
}
```

## UI Components

### Drag Handle
```html
<div class="drag-handle me-3" cdkDragHandle title="Drag to reorder">
  <i class="mdi mdi-drag-vertical text-muted fs-4"></i>
</div>
```

**Features:**
- Cursor changes to grab/grabbing
- Hover effect (scales up)
- Only drag handle area is draggable (not entire card)

### Drag Preview
```html
<div class="card drag-preview" *cdkDragPreview>
  <!-- Shows item number and title while dragging -->
</div>
```

**Features:**
- Custom preview separate from original element
- Shows item type (Item vs Sub-item)
- Styled with shadow and border

### Promote Button
```html
<button 
  type="button" 
  class="btn btn-sm btn-outline-secondary" 
  (click)="promoteToParent(i)"
  *ngIf="item.get('level')?.value === 1">
  <i class="mdi mdi-arrow-up-bold me-1"></i>Promote
</button>
```

**Only shown on:**
- Sub-items (level=1)
- Not available on parent items

## Styling

### CSS Classes
```css
.drag-handle {
  cursor: move; /* Shows move cursor */
  transition: all 0.2s;
}

.drag-handle:hover {
  transform: scale(1.1); /* Slight zoom on hover */
}

.cdk-drag-placeholder {
  opacity: 0.4; /* Semi-transparent placeholder */
  border: 2px dashed #0d6efd; /* Dashed blue border */
}

.drag-preview {
  box-shadow: 0 5px 15px rgba(0,0,0,0.3); /* Drop shadow */
  border: 2px solid #0d6efd; /* Blue border */
}
```

### Hierarchy Indicators
- **Indentation**: `[class.ms-4]="level === 1"` (margin-left: 1.5rem)
- **Border**: `[class.border-start]="level === 1"` (left border)
- **Border Width**: `[class.border-4]="level === 1"` (4px thick)
- **Background Tint**: `background: rgba(13, 110, 253, 0.02)` (subtle blue)

## Usage Examples

### Example 1: Moving a Sub-item to Different Parent
**Before:**
```
Item 14 (parent)
  └─ Sub-item 14.1
  └─ Sub-item 14.2
Item 15 (parent)
```

**Action:** Drag Sub-item 14.2 and drop it after Item 15

**After:**
```
Item 14 (parent)
  └─ Sub-item 14.1
Item 15 (parent)
  └─ Sub-item 15.1  ← (formerly 14.2, reparented)
```

### Example 2: Moving Parent with Children
**Before:**
```
Item 13
Item 14 (parent)
  └─ Sub-item 14.1
  └─ Sub-item 14.2
Item 15
```

**Action:** Drag Item 14 between Item 15 and below

**After:**
```
Item 13
Item 14 (now ordered 14)
Item 15 (now ordered 15)  ← Item 14 moved here
  └─ Sub-item 15.1  ← Children moved with parent
  └─ Sub-item 15.2
```

### Example 3: Promoting Sub-item to Parent
**Before:**
```
Item 14 (parent)
  └─ Sub-item 14.1
  └─ Sub-item 14.2
```

**Action:** Click "Promote" button on Sub-item 14.2

**After:**
```
Item 14 (parent)
  └─ Sub-item 14.1
Item 15  ← (formerly Sub-item 14.2, now promoted)
```

## Technical Notes

### CDK Drag-Drop
Using Angular CDK's drag-drop module:
```typescript
import { CdkDragDrop, moveItemInArray, DragDropModule } from '@angular/cdk/drag-drop';
```

**Directives:**
- `cdkDropList` - Container for draggable items
- `cdkDrag` - Makes element draggable
- `cdkDragHandle` - Restricts drag to specific handle
- `*cdkDragPreview` - Custom preview while dragging

### Order Index Calculation
**Parent items:**
- Simple increment: 1, 2, 3, 4, 5...

**Child items:**
- Decimal notation: parent_id + (child_number / 10)
- Examples: 14.1, 14.2, 14.3 (up to 14.9)
- Limitation: Max 9 children per parent (extendable to 99 by using /100)

### Future Enhancements
1. **Deeper nesting** - Support level 2, 3 (grandchildren)
2. **Visual connection lines** - Show tree structure with lines
3. **Collapse/Expand** - Hide/show children of a parent
4. **Keyboard navigation** - Arrow keys to reorder
5. **Undo/Redo** - History of drag operations
6. **Batch operations** - Select multiple and move together

## Testing Checklist

- [ ] Drag sub-item to different parent
- [ ] Drag sub-item to top (should convert to parent)
- [ ] Drag parent item (children should move with it)
- [ ] Promote sub-item to parent
- [ ] Verify order indices update correctly
- [ ] Check visual feedback during drag
- [ ] Test with multiple levels of nesting
- [ ] Save and reload - verify structure persists

## Benefits

✅ **Intuitive UX** - Natural drag-drop behavior
✅ **Smart reparenting** - Automatically detects intent
✅ **Maintains structure** - Parents keep their children
✅ **Visual clarity** - Clear hierarchy indicators
✅ **Flexible** - Easy to reorganize complex structures
✅ **Performant** - Efficient order index calculation
