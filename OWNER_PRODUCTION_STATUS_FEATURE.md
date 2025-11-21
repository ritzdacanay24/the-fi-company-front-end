# Owner "Currently Working" Feature Implementation

## Overview
This feature adds the ability to track which owners are **currently working** on items and highlights those items on the production priority board with special styling.

## Database Changes

### Migration File
- **Location**: `database/migrations/add_is_production_to_owners.sql`
- **Column Added**: `is_production` TINYINT(1) NOT NULL DEFAULT 0
- **Index**: `idx_is_production` on (`is_production`, `is_active`)

### To Apply Migration
```sql
-- Run this SQL in your database:
source database/migrations/add_is_production_to_owners.sql;
```

Or manually:
```sql
ALTER TABLE `owners` 
ADD COLUMN `is_production` TINYINT(1) NOT NULL DEFAULT 0 
COMMENT 'Flag indicating if owner is currently working on items (1=working, 0=not working)' 
AFTER `is_active`;

CREATE INDEX `idx_is_production` ON `owners` (`is_production`, `is_active`);
```

## Frontend Changes

### 1. Owner Interface Updated
- **File**: `src/app/core/api/owners/owners.service.ts`
- **Added**: `is_production?: boolean` field to `Owner` interface

### 2. Owner Management Modal
- **File**: `src/app/shared/components/owner-management-modal/owner-management-modal.component.ts`

**Features Added:**
- Toggle switch: "Currently Working" 
  - Label shows "In Production" (green wrench icon) when checked
  - Label shows "Not Working" (pause icon) when unchecked
- "Work Status" column in owners table
  - Green badge "Working Now" for active work status
  - Gray badge "Not Working" for inactive
- Helper text: "Show in production board with highlight"

### 3. Priority Board Display
- **File**: `src/app/standalone/shipping-priority-display/components/multi-card-view/`

**TypeScript Methods Added:**
```typescript
isOwnerInProduction(item: any): boolean
getProductionOwnerName(item: any): string
```

**HTML Template:**
- Production banner at top of cards when `is_production = true`
- Shows: "IN PRODUCTION - [Owner Name]"
- Banner includes animated wrench icon

**CSS Styling:**
- `.production-banner` - Green gradient banner with pulse animation
- `.priority-card.in-production` - Special card styling:
  - 3px solid green border
  - Glowing box shadow
  - Animated shimmer effect on top border
  - Subtle background glow
  - Rotating wrench icon animation

## How to Use

### For Administrators:
1. Open Owner Management modal
2. Edit an owner
3. Check "Currently Working" toggle when they start working on items
4. Items assigned to this owner will now show highlighted on the board

### Visual Indicators on Priority Board:
- **Green Banner**: "IN PRODUCTION - [Owner Name]" at top of card
- **Green Border**: 3px solid border around entire card
- **Glow Effect**: Green shadow around card
- **Shimmer**: Animated top border shimmer
- **Animations**: Rotating wrench icon, pulsing glow

### Backend Requirements

The backend API needs to include owner production status in the order data:

```php
// Example: In your shipping/kanban priority API response
$order['owner_is_production'] = $owner['is_production']; // Boolean
$order['owner_name'] = $owner['name']; // String

// Or in misc data:
$order['misc']['owner_is_production'] = $owner['is_production'];
$order['misc']['owner_name'] = $owner['name'];
```

## Color Scheme

### Light Mode:
- Banner: Green gradient (#10b981 to #059669)
- Border: #10b981
- Shadow: rgba(16, 185, 129, 0.4)

### Dark Mode:
- Banner: Darker green (#059669 to #047857)
- Border: #059669
- Shadow: rgba(5, 150, 105, 0.5)

## Testing Checklist

- [ ] Database migration applied successfully
- [ ] Owner management modal displays "Currently Working" toggle
- [ ] Toggle can be saved for new owners
- [ ] Toggle can be updated for existing owners
- [ ] Work Status column shows correct badge
- [ ] Backend API includes `owner_is_production` in order data
- [ ] Priority board shows production banner for working owners
- [ ] Cards have green border and glow effect
- [ ] Animations working (shimmer, pulse, wrench rotation)
- [ ] Dark mode styling applies correctly
- [ ] Production status updates in real-time on board

## Future Enhancements

1. **Quick Toggle**: Add button on priority board to toggle production status directly
2. **Filter**: Add filter to show only "in production" items
3. **Timer**: Track how long owner has been working on item
4. **Multiple Owners**: Support multiple owners working on same item
5. **Notifications**: Alert when owner marks item as "in production"

## Notes

- The `is_production` field is intentionally separate from `is_active`
- `is_active` = Whether owner exists in system (active/inactive)
- `is_production` = Whether owner is currently working (working/not working)
- An owner must be `is_active = 1` to be assigned to items
- Production status can be toggled frequently during shifts
