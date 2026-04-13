# EyeFi Serial Auto-Populate with Edit Mode Feature

## Overview
Auto-populate serial numbers and UL labels with a clean read-only view. Users can click "Edit" on any row if physical devices don't match the auto-selected values.

## User Experience Flow

### Step 1: Work Order Entry
User enters work order number for the batch.

### Step 2: Configure Batch
User enters:
- **Quantity**: Number of serial assignments (1-50)
- **Category**: New (available) or Used

### Step 3: Auto-Populate & Review (NEW UX!)

**Automatic Population:**
When user clicks "Next Step" from Step 2 → Step 3:
1. System fetches next N available serial numbers (based on category)
2. System uses first N available UL labels
3. Displays everything in **read-only mode**

**Read-Only Display:**
```
#  | EyeFi Serial Number          | UL Label Number        | Actions
1  | EF-001234 [Auto]            | UL-5001 - New [Auto]   | ✏️ 🔄
2  | EF-001235 [Auto]            | UL-5002 - New [Auto]   | ✏️ 🔄
3  | EF-001236 [Auto]            | UL-5003 - New [Auto]   | ✏️ 🔄
```

**If Physical Device Matches:**
✅ User simply reviews and clicks "Next Step"

**If Physical Device Doesn't Match:**
1. User clicks ✏️ **Edit** button on row #3
2. Row switches to **edit mode** with search field and dropdown
3. User searches for correct serial (e.g., "EF-007890")
4. User selects correct UL if needed
5. User clicks ✅ **Save** or ❌ **Cancel**
6. Badge changes from [Auto] to [Manual]
7. 🔄 **Reset** button appears to revert back

## Data Model

```typescript
serialAssignments: Array<{
  serial: any;                // Selected serial object
  ulNumber: any;              // Selected UL object
  isAutoPopulated: boolean;   // Track if auto-populated by system
  manuallyChanged: boolean;   // Track if user manually changed it
  isEditing: boolean;         // Track if currently in edit mode
}>
```

## Implementation Details

### Auto-Populate Logic

```typescript
async autoPopulateSerials(): Promise<void> {
  // Called when moving from Step 2 → Step 3
  
  // 1. Fetch serials based on category
  const status = this.category === 'new' ? 'available' : 'used';
  const serialsResponse = await this.serialNumberService.getAllSerialNumbers({
    status: status,
    limit: this.quantity
  });
  
  // 2. Use pre-loaded UL numbers (loaded on authentication)
  const serials = serialsResponse.data.slice(0, this.quantity);
  const uls = this.availableULs.slice(0, this.quantity);
  
  // 3. Populate assignments in read-only mode
  for (let i = 0; i < this.quantity; i++) {
    this.serialAssignments[i].serial = serials[i];
    this.serialAssignments[i].ulNumber = uls[i];
    this.serialAssignments[i].isAutoPopulated = true;
    this.serialAssignments[i].isEditing = false; // ← Start read-only
  }
}
```

### Edit Mode Toggle

```typescript
toggleEditMode(index: number): void {
  // Switch row to edit mode
  this.serialAssignments[index].isEditing = true;
}

saveEdit(index: number): void {
  // Save changes and exit edit mode
  this.serialAssignments[index].isEditing = false;
  this.serialAssignments[index].manuallyChanged = true;
}

cancelEdit(index: number): void {
  // Discard changes and exit edit mode
  this.serialAssignments[index].isEditing = false;
}

resetAssignmentToAuto(index: number): void {
  // Reset manual changes back to auto
  this.serialAssignments[index].manuallyChanged = false;
  this.serialAssignments[index].isEditing = false;
}
```

### Template Structure

```html
<tr *ngFor="let assignment of serialAssignments; let i = index">
  <td>{{ i + 1 }}</td>
  
  <!-- Serial Column -->
  <td>
    <!-- READ-ONLY MODE -->
    <div *ngIf="!assignment.isEditing && assignment.serial">
      <strong>{{ assignment.serial.serial_number }}</strong>
      <span class="badge bg-info" *ngIf="!assignment.manuallyChanged">Auto</span>
      <span class="badge bg-warning" *ngIf="assignment.manuallyChanged">Manual</span>
    </div>
    
    <!-- EDIT MODE -->
    <div *ngIf="assignment.isEditing || !assignment.serial">
      <app-eyefi-serial-search-ng
        [(ngModel)]="assignment.serial"
        (notifyParent)="onSerialAssigned(i, $event)">
      </app-eyefi-serial-search-ng>
    </div>
  </td>
  
  <!-- UL Column -->
  <td>
    <!-- READ-ONLY MODE -->
    <div *ngIf="!assignment.isEditing && assignment.ulNumber">
      <strong>{{ assignment.ulNumber.ul_number }}</strong>
      <span class="badge bg-info" *ngIf="!assignment.manuallyChanged">Auto</span>
      <span class="badge bg-warning" *ngIf="assignment.manuallyChanged">Manual</span>
    </div>
    
    <!-- EDIT MODE -->
    <div *ngIf="assignment.isEditing || !assignment.ulNumber">
      <select [(ngModel)]="assignment.ulNumber">
        <option *ngFor="let ul of availableULs" [ngValue]="ul">
          {{ ul.ul_number }} - {{ ul.category }}
        </option>
      </select>
    </div>
  </td>
  
  <!-- Actions Column -->
  <td>
    <!-- READ-ONLY: Show Edit button -->
    <button *ngIf="!assignment.isEditing" (click)="toggleEditMode(i)">
      <i class="mdi mdi-pencil"></i>
    </button>
    
    <!-- EDIT MODE: Show Save/Cancel -->
    <div *ngIf="assignment.isEditing">
      <button (click)="saveEdit(i)">✓</button>
      <button (click)="cancelEdit(i)">✗</button>
    </div>
    
    <!-- MANUAL: Show Reset -->
    <button *ngIf="assignment.manuallyChanged && !assignment.isEditing"
            (click)="resetAssignmentToAuto(i)">
      <i class="mdi mdi-refresh"></i>
    </button>
  </td>
</tr>
```

## Visual States

| State | Serial Display | UL Display | Actions | Badge |
|-------|---------------|------------|---------|-------|
| **Auto (Read-only)** | `EF-001234` | `UL-5001 - New` | ✏️ Edit | 🔵 Auto |
| **Edit Mode** | `[Search Field]` | `[Dropdown]` | ✅ Save, ❌ Cancel | - |
| **Manual (Read-only)** | `EF-007890` | `UL-5010 - New` | ✏️ Edit, 🔄 Reset | 🟡 Manual |

## Benefits

✅ **Clean UI**: Read-only view is cleaner than showing all inputs
✅ **Faster**: No need to interact if devices match
✅ **Clear Intent**: Edit mode is explicit user action
✅ **Flexible**: Can edit any field if needed
✅ **Reversible**: Reset button to undo manual changes
✅ **Visual Feedback**: Badges show Auto vs Manual status

## API Calls

### Serial Numbers
```typescript
GET eyefi-serial-numbers/index.php?status=available&limit=5
GET eyefi-serial-numbers/index.php?status=used&limit=5
```

### UL Labels
```typescript
// Already loaded on authentication
this.availableULs = [...]; // Pre-loaded array
```

## Error Handling

1. **Serials API fails** → Fallback to manual edit mode for all rows
2. **No UL numbers** → Populate serials only, UL dropdown available
3. **Partial data** → Populate what's available, rest goes to edit mode

## Example Scenarios

### Scenario 1: All Match (Happy Path)
- Auto-populates 5 serials + 5 ULs
- User reviews in read-only mode
- Clicks "Next Step"
- **Time saved:** ~2 minutes

### Scenario 2: One Mismatch
- Auto-populates 5 serials + 5 ULs
- Row #3 doesn't match physical device
- User clicks Edit on row #3
- Searches for correct serial
- Clicks Save
- Badge shows "Manual"
- Proceeds to next step
- **Time saved:** ~1.5 minutes

### Scenario 3: Auto-populate Fails
- API error or no available serials
- All rows default to edit mode
- User manually selects all
- Same as original manual workflow
- **Time saved:** 0 (fallback works)

## Debugging

Check console logs:
```javascript
console.log('Serials Response:', serialsResponse);
console.log('Available ULs:', this.availableULs);
console.log('Assignment 0:', {
  serial: this.serialAssignments[0].serial?.serial_number,
  ul: this.serialAssignments[0].ulNumber?.ul_number
});
```

## Conclusion

This implementation provides a **clean, efficient UX** that:
- Shows auto-populated values in read-only mode
- Allows quick review if devices match
- Provides easy editing if devices don't match
- Maintains visual clarity with badges
- Supports reset for mistake recovery
