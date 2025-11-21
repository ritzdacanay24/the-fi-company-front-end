# Kanban Priority System Implementation

## Overview
Created a separate kanban priority system that mirrors the shipping priority implementation, allowing independent priority management for kanban/production orders while using the same sales order identifiers.

## Database Changes

### New Table: `kanban_priorities`
**Location:** `database/migrations/add_kanban_priority.sql`

```sql
CREATE TABLE kanban_priorities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL,
    sales_order_number VARCHAR(50) NOT NULL,
    sales_order_line VARCHAR(10) DEFAULT NULL,
    priority_level INT NOT NULL,
    notes TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by VARCHAR(50) DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE
);
```

**Key Features:**
- Separate priority sequence from shipping priorities
- Same identifier structure (SO number + line)
- Indexed for performance on order_id, sales_order_number, priority_level
- View: `active_kanban_priorities` for easy querying

### Why Separate Tables?

✅ **Independent Priority Sequences**: Kanban can have Priority 1, 2, 3... independent of Shipping  
✅ **Same Identifiers**: Both use sales_order_number + sales_order_line  
✅ **Clear Separation**: Each system manages its own priorities  
✅ **No Conflicts**: Priority 1 in kanban doesn't conflict with Priority 1 in shipping  

**Example:**
- Shipping: SO123-001 = Priority 1, SO456-002 = Priority 2
- Kanban: SO789-003 = Priority 1, SO123-001 = Priority 2
- Both systems work independently!

## Backend API

### New Endpoint: `/backend/api/kanban-priorities/index.php`

**Methods:**
- `GET /kanban-priorities/` - Get all active kanban priorities
- `GET /kanban-priorities/?order_id={id}` - Get priority by order ID
- `POST /kanban-priorities/?action=apply_change` - Create/update/remove priority (atomic)
- `POST /kanban-priorities/?action=reorder` - Bulk reorder priorities (drag-and-drop)

**Atomic Operations:**
- Automatically shifts priorities when inserting
- Resequences when removing
- Handles moves between positions
- All operations are transactional (rollback on error)

## Frontend Service Updates

### Updated: `MasterSchedulingService`

**New Methods:**
```typescript
// Get all kanban priorities
getKanbanPriorities(): Promise<PriorityResponse>

// Update/create kanban priority
updateKanbanPriority(params: PriorityRequest): Promise<PriorityResponse>

// Remove kanban priority
removeKanbanPriority(orderId: string): Promise<PriorityResponse>

// Reorder multiple priorities (drag-and-drop)
reorderKanbanPriorities(updates: Array<{id: string, priority_level: number}>): Promise<PriorityResponse>
```

**Features:**
- Mock mode support for testing
- Same interface as shipping priorities
- Type-safe with TypeScript interfaces
- Error handling with detailed messages

## Usage Examples

### 1. Get All Kanban Priorities
```typescript
const response = await this.api.getKanbanPriorities();
if (response.success) {
  const priorities = response.data; // Array of priority objects
}
```

### 2. Set Priority for an Order
```typescript
await this.api.updateKanbanPriority({
  orderId: 'SO12345-001',
  salesOrderNumber: 'SO12345',
  salesOrderLine: '001',
  priority: 1,
  notes: 'Rush production order'
});
```

### 3. Remove Priority
```typescript
await this.api.removeKanbanPriority('SO12345-001');
// Or set priority to 0
await this.api.updateKanbanPriority({
  orderId: 'SO12345-001',
  salesOrderNumber: 'SO12345',
  salesOrderLine: '001',
  priority: 0
});
```

### 4. Reorder Priorities (Drag-and-Drop)
```typescript
await this.api.reorderKanbanPriorities([
  { id: '1', priority_level: 1 },
  { id: '2', priority_level: 2 },
  { id: '3', priority_level: 3 }
]);
```

## Integration with Kanban Board

### Recommended Implementation:

1. **Add Priority Column to Kanban Grid**
   - Editable priority field
   - Visual indicators (star badges)
   - Inline validation

2. **Priority Orders Tab**
   - Separate tab showing only prioritized orders
   - Sorted by priority level
   - Drag-and-drop reordering

3. **Visual Indicators**
   - Priority badge on kanban cards
   - Color coding by priority level
   - Sort/filter by priority

### Example Component Integration:

```typescript
export class KanbanBoardComponent {
  priorities: any[] = [];
  
  async ngOnInit() {
    await this.loadPriorities();
  }
  
  async loadPriorities() {
    const response = await this.api.getKanbanPriorities();
    if (response.success) {
      this.priorities = response.data;
      this.mergePrioritiesWithOrders();
    }
  }
  
  async setPriority(order: any, priority: number) {
    const response = await this.api.updateKanbanPriority({
      orderId: `${order.SOD_NBR}-${order.SOD_LINE}`,
      salesOrderNumber: order.SOD_NBR,
      salesOrderLine: order.SOD_LINE,
      priority: priority,
      notes: ''
    });
    
    if (response.success) {
      await this.loadPriorities(); // Refresh
    } else {
      alert(response.message); // Show error
    }
  }
}
```

## Files Created/Modified

### Created:
1. ✅ `database/migrations/add_kanban_priority.sql` - Database migration
2. ✅ `backend/api/kanban-priorities/index.php` - Backend API endpoint

### Modified:
1. ✅ `src/app/core/api/operations/master-scheduling/master-scheduling.service.ts`
   - Added kanban priority methods
   - Added PriorityRequest/PriorityResponse interfaces
   - Added mock data support

## Testing Checklist

- [ ] Run database migration
- [ ] Test API endpoints with Postman
- [ ] Verify priority uniqueness within kanban
- [ ] Verify independence from shipping priorities
- [ ] Test drag-and-drop reordering
- [ ] Test priority removal and resequencing
- [ ] Verify WebSocket updates (if applicable)

## Next Steps

1. **Run the migration:**
   ```sql
   source database/migrations/add_kanban_priority.sql
   ```

2. **Update kanban component** to use the new priority methods

3. **Add UI elements:**
   - Priority column in grid
   - Priority orders tab
   - Drag-and-drop interface
   - Visual priority indicators

4. **Test the integration** with real kanban data

## Migration Notes

- Backwards compatible with existing code
- Shipping priorities unchanged
- No data migration needed (clean slate)
- Can enable/disable independently

## Support

The implementation follows the exact same pattern as shipping priorities, so you can reference:
- `shipping.component.ts` for UI implementation examples
- `priority-display.service.ts` for service usage patterns
- `docs/shipping-priority-system.md` for detailed documentation
