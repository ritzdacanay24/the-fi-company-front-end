# Owner Dropdown Feature Toggle

## Overview
Added a global setting to enable/disable the owner dropdown/input field across the entire application. This setting can be controlled from the Owner Management modal by admin users.

## Database Changes

### New Table: `system_settings`
Created a new table to store application-wide settings:
- `id`: Auto-increment primary key
- `setting_key`: Unique setting identifier (VARCHAR 100)
- `setting_value`: Setting value (TEXT)
- `description`: Setting description (VARCHAR 255)
- `updated_by`: User who last updated the setting
- `updated_at`: Last update timestamp
- `created_at`: Creation timestamp

**Migration File**: `database/migrations/create_system_settings_table.sql`

Run this SQL to create the table:
```sql
mysql -u your_user -p your_database < database/migrations/create_system_settings_table.sql
```

## Backend Changes

### API Endpoints Added (`backend/api/owners/index.php`)

#### 1. Get Owner Dropdown Setting
- **Method**: GET
- **Endpoint**: `?action=dropdown-setting`
- **Response**: 
  ```json
  {
    "success": true,
    "data": {
      "enabled": true
    }
  }
  ```

#### 2. Set Owner Dropdown Setting
- **Method**: POST
- **Endpoint**: (no action parameter needed)
- **Payload**:
  ```json
  {
    "action": "set-dropdown-setting",
    "enabled": true,
    "updated_by": "user_id"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Owner dropdown setting updated successfully",
    "data": {
      "enabled": true
    }
  }
  ```

### New Methods in `OwnersAPI` Class
- `getOwnerDropdownSetting()`: Retrieves current setting from database
- `setOwnerDropdownSetting($enabled, $updatedBy)`: Updates setting in database

## Frontend Changes

### Service Methods Added (`src/app/core/api/owners/owners.service.ts`)

```typescript
// Get current owner dropdown setting
getOwnerDropdownSetting = async (): Promise<{success: boolean; data: {enabled: boolean}; error?: string}>

// Set owner dropdown setting
setOwnerDropdownSetting = async (enabled: boolean, updatedBy?: string): Promise<OwnerResponse>
```

### Owner Management Modal Updates

#### New "Settings" Tab
Added a new tab to the Owner Management modal with:
- Large toggle switch to enable/disable owner dropdown
- Visual feedback (green for enabled, gray for disabled)
- Loading indicator while saving
- Warning message about the impact of disabling the feature

#### Component Properties Added
```typescript
activeTab: 'owners' | 'assignments' | 'admins' | 'settings' = 'owners';
ownerDropdownEnabled = true;
savingSettings = false;
```

#### Component Methods Added
- `switchToSettingsTab()`: Navigate to settings tab
- `loadOwnerDropdownSetting()`: Load current setting from API
- `toggleOwnerDropdown()`: Save new setting when toggle is changed

## Usage

### For Admin Users
1. Open Owner Management modal
2. Click the "Settings" tab
3. Toggle the "Owner Dropdown/Input Field" switch
4. Setting is saved automatically
5. Changes apply immediately across the entire application

### For Developers
To check if owner dropdown should be displayed:

```typescript
// In your component
async ngOnInit() {
  const response = await this.ownersService.getOwnerDropdownSetting();
  this.showOwnerDropdown = response.data.enabled;
}
```

```html
<!-- In your template -->
<div *ngIf="showOwnerDropdown" class="owner-dropdown">
  <!-- Owner selection UI -->
</div>
```

## Benefits
1. **Centralized Control**: One setting controls owner dropdowns across entire application
2. **Persistent Storage**: Setting stored in database, survives application restarts
3. **Admin Only**: Only users with admin permission can change this setting
4. **Immediate Effect**: Changes apply instantly without requiring application reload
5. **Audit Trail**: Tracks who made the change and when

## Next Steps
To fully implement this feature across your application:

1. **Run the migration** to create the `system_settings` table
2. **Update forms** to check the setting before showing owner dropdowns
3. **Add to guards/interceptors** if you want to enforce this at the API level
4. **Consider caching** the setting on the frontend to avoid repeated API calls

## Example Implementation in Forms

```typescript
export class YourFormComponent implements OnInit {
  showOwnerDropdown = true;
  
  async ngOnInit() {
    // Load owner dropdown setting
    try {
      const response = await this.ownersService.getOwnerDropdownSetting();
      this.showOwnerDropdown = response.data.enabled;
    } catch (error) {
      console.error('Error loading owner dropdown setting:', error);
      this.showOwnerDropdown = true; // Default to enabled
    }
  }
}
```

```html
<div *ngIf="showOwnerDropdown" class="form-group">
  <label>Owner</label>
  <select class="form-control" [(ngModel)]="selectedOwner">
    <option *ngFor="let owner of owners" [value]="owner.id">
      {{ owner.name }}
    </option>
  </select>
</div>
```
