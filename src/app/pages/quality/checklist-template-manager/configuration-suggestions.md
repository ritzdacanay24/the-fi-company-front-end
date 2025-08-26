# Checklist Template Manager - Configuration Enhancements

## Phase 1: Photo Quality & Format (High Priority)

### Photo Requirements Enhancement
Add these fields to the Photo Requirements section:

```typescript
// In photo_requirements form group
accepted_formats: FormControl<string[]>     // ["jpg", "png", "heic"]
max_file_size_mb: FormControl<number>       // Default: 10MB
required_resolution: FormControl<string>    // "1920x1080" or "4K"
require_gps_location: FormControl<boolean>  // For location verification
require_timestamp: FormControl<boolean>     // For audit trail
```

### UI Addition
```html
<!-- Add to Photo Requirements expandable section -->
<div class="row">
  <div class="col-md-6 mb-3">
    <label class="form-label fw-bold">File Format</label>
    <select class="form-select form-select-sm" formControlName="accepted_formats" multiple>
      <option value="jpg">JPEG</option>
      <option value="png">PNG</option>
      <option value="heic">HEIC</option>
      <option value="webp">WebP</option>
    </select>
  </div>
  <div class="col-md-6 mb-3">
    <label class="form-label fw-bold">Max File Size (MB)</label>
    <input type="number" class="form-control form-control-sm" 
           formControlName="max_file_size_mb" min="1" max="50" placeholder="10">
  </div>
</div>
```

## Phase 2: Approval Workflow (Medium Priority)

### Item-Level Approval
```typescript
// Add to item form group
requires_supervisor_approval: FormControl<boolean>
approval_roles: FormControl<string[]>
auto_approve_after_hours: FormControl<number>
```

## Phase 3: Advanced Features (Lower Priority)

### Template-Level Settings
- Default completion timeframes
- Notification preferences  
- Batch creation support
- Conditional logic for showing/hiding items

## Implementation Strategy

1. **Start Small**: Begin with photo format and file size validation
2. **User Feedback**: Test with actual operators before adding complexity
3. **Gradual Rollout**: Add features incrementally based on usage patterns
4. **Keep Simple**: Maintain the clean, focused UI that works well currently

## Database Schema Updates Required

```sql
-- Add columns to checklist_items table
ALTER TABLE checklist_items ADD COLUMN accepted_formats JSON;
ALTER TABLE checklist_items ADD COLUMN max_file_size_mb INT DEFAULT 10;
ALTER TABLE checklist_items ADD COLUMN required_resolution VARCHAR(20);
ALTER TABLE checklist_items ADD COLUMN require_gps_location BOOLEAN DEFAULT FALSE;
ALTER TABLE checklist_items ADD COLUMN require_timestamp BOOLEAN DEFAULT TRUE;

-- Add columns to checklist_templates table  
ALTER TABLE checklist_templates ADD COLUMN default_duration_hours INT;
ALTER TABLE checklist_templates ADD COLUMN notification_settings JSON;
```

## Benefits

- **Photo Quality**: Ensures consistent, high-quality documentation
- **File Management**: Controls storage usage and upload times
- **Audit Trail**: Better compliance and traceability
- **Workflow Control**: Proper approval processes for critical items
- **User Experience**: Clear expectations and requirements
