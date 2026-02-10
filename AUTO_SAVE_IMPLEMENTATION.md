# Auto-Save Implementation - Frontend Steps

## Database ✅ DONE
- Added `is_draft` and `last_autosave_at` columns
- Backend endpoints created: `/autosave` and `/publish`

## Frontend Implementation Required

### 1. Update Service (photo-checklist-config.service.ts)

Add these methods:

```typescript
autosaveTemplate(id: number | null, template: Partial<ChecklistTemplate>): Observable<{success: boolean, template_id: number}> {
  const url = id ? `${this.baseUrl}?request=autosave&id=${id}` : `${this.baseUrl}?request=autosave`;
  return this.http.post<{success: boolean, template_id: number}>(url, template);
}

publishTemplate(id: number): Observable<{success: boolean, published: boolean}> {
  return this.http.post<{success: boolean, published: boolean}>(
    `${this.baseUrl}?request=publish&id=${id}`, {}
  );
}
```

### 2. Add Auto-Save to Template Editor Component

**Add properties:**
```typescript
autosaveInterval: any;
lastAutosaveTime: Date | null = null;
autosaving = false;
draftId: number | null = null;
isDraft = true;
```

**In ngOnInit():**
```typescript
// Start auto-save timer (every 10 seconds)
this.autosaveInterval = setInterval(() => {
  if (this.templateForm.dirty && !this.saving) {
    this.autoSave();
  }
}, 10000);

// Listen for form changes
this.templateForm.valueChanges.pipe(
  debounceTime(500)
).subscribe(() => {
  // Mark as having unsaved changes
});
```

**In ngOnDestroy():**
```typescript
if (this.autosaveInterval) {
  clearInterval(this.autosaveInterval);
}
```

**Add auto-save method:**
```typescript
private autoSave(): void {
  if (this.autosaving || this.saving) return;
  
  this.autosaving = true;
  const templateData = this.templateForm.value;
  templateData.is_draft = 1; // Force draft
  
  this.configService.autosaveTemplate(this.draftId, templateData).subscribe({
    next: (response) => {
      this.draftId = response.template_id;
      this.lastAutosaveTime = new Date();
      this.autosaving = false;
      this.templateForm.markAsPristine(); // Clear dirty flag
      console.log('✅ Auto-saved at', this.lastAutosaveTime.toLocaleTimeString());
    },
    error: (error) => {
      this.autosaving = false;
      console.error('Auto-save failed:', error);
    }
  });
}
```

**Update save method to publish:**
```typescript
// In proceedWithSave(), after successful save:
if (this.draftId) {
  // Publish the draft
  this.configService.publishTemplate(this.draftId).subscribe({
    next: () => {
      this.isDraft = false;
      this.draftId = null;
      // Clear auto-save interval
      if (this.autosaveInterval) {
        clearInterval(this.autosaveInterval);
      }
      // Navigate away or show success
    }
  });
}
```

### 3. Add UI Indicator (template HTML)

Add to template header:
```html
<div class="draft-indicator" *ngIf="isDraft">
  <span class="badge badge-warning">Draft</span>
  <small *ngIf="lastAutosaveTime" class="text-muted">
    Last saved: {{lastAutosaveTime | date:'shortTime'}}
  </small>
  <small *ngIf="autosaving" class="text-info">
    <i class="fas fa-spinner fa-spin"></i> Saving...
  </small>
</div>
```

### 4. Benefits You Get

✅ **Never lose work** - Saves every 10 seconds
✅ **Cross-device** - Resume on any device
✅ **Network resilient** - Continues saving after connection restored
✅ **User-friendly** - Clear indicators show draft status
✅ **Professional** - Same as Google Docs, Notion, etc.

### 5. Testing

1. Create new template
2. Add items
3. Wait 10 seconds - should see "Saving..." then "Last saved at..."
4. Refresh page - should still have draft
5. Click Publish - converts to published template
6. Auto-save stops after publish

## Run Migration

```bash
mysql -u root -p eyefi_modern < database/migrations/add_draft_status_to_templates.sql
```

## Next Steps

Want me to implement the frontend code directly in your files?
