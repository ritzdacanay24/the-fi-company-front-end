# EyeFi Serial Number Duplicate Prevention in UL Usage Form

## Problem
When recording multiple UL usages in the same form, users could select the same EyeFi serial number for different UL transactions, which doesn't make sense (one serial number can't be used on multiple devices simultaneously).

## Solution
Added automatic exclusion of already-selected serial numbers from the dropdown options.

---

## Changes Made

### 1. **EyefiSerialSearchComponent** (`eyefi-serial-search.component.ts`)

#### Added new `@Input`:
```typescript
@Input() excludeSerials: string[] = []; // Serial numbers to exclude from search results
```

#### Updated filter logic (2 places):
```typescript
// When loading initial serials
this.filteredSerialNumbers = this.serialNumbers.filter(
  serial => !this.excludeSerials.includes(serial.serial_number)
);

// When searching serials
this.filteredSerialNumbers = this.serialNumbers.filter(
  serial => !this.excludeSerials.includes(serial.serial_number)
);
```

### 2. **UL Usage Form Component** (`ul-usage-form.component.ts`)

#### Added helper method:
```typescript
getExcludedSerialNumbers(currentUlNumber: string): string[] {
  // Get all selected serial numbers from bulk transactions except the current one
  const selectedSerials = this.bulkTransactions
    .filter(t => t.ul_number !== currentUlNumber && t.serial_number && t.serial_number.trim() !== '')
    .map(t => t.serial_number);
  
  // Also include the serial from single form if applicable
  const singleSerial = this.usageForm.get('serial_number')?.value;
  if (singleSerial && singleSerial.trim() !== '' && !selectedSerials.includes(singleSerial)) {
    selectedSerials.push(singleSerial);
  }
  
  return selectedSerials;
}
```

### 3. **UL Usage Form Template** (`ul-usage-form.component.html`)

#### Updated EyeFi search component in bulk forms:
```html
<app-eyefi-serial-search 
    [(ngModel)]="getBulkTransactionByUL(ulNumber).serial_number"
    [ngModelOptions]="{standalone: true}"
    [name]="'bulk_serial_' + i"
    [form_label]="'Serial Number'" 
    [placeholder]="'Search and select EyeFi serial number'"
    [required]="true" 
    [showLabel]="true"
    [status]="'available'"
    [strictMode]="true"
    [excludeSerials]="getExcludedSerialNumbers(ulNumber)">  <!-- NEW -->
</app-eyefi-serial-search>
```

---

## How It Works

### Scenario: User selects 3 UL numbers for bulk recording

1. **UL 1 Form:**
   - Shows all available EyeFi serials
   - User selects serial "ABC123"
   
2. **UL 2 Form:**
   - Excludes "ABC123" from dropdown
   - Shows all available serials except "ABC123"
   - User selects serial "DEF456"
   
3. **UL 3 Form:**
   - Excludes both "ABC123" and "DEF456"
   - Shows all available serials except those two
   - User selects serial "GHI789"

### Result:
✅ Each UL transaction has a unique EyeFi serial number  
✅ No duplicate serials possible in the same form submission  
✅ User gets immediate visual feedback (excluded serials don't appear in dropdown)

---

## Benefits

1. **Prevents logical errors** - Can't assign one serial to multiple devices
2. **Better UX** - Only shows valid options, reduces confusion
3. **Maintains database integrity** - Works with existing triggers
4. **Real-time validation** - No need to wait for server-side error
5. **Clear feedback** - If a serial doesn't appear, user knows it's already selected

---

## Important Notes

- This is **client-side prevention only** - database triggers still provide final validation
- Works for both automatic and manual UL selection methods
- Excludes serials from both single form and bulk forms
- Empty/null serials are not excluded (haven't been selected yet)
- The excluded list updates dynamically as user selects/changes serials

---

## Testing Checklist

- [ ] Select 2 UL numbers in automatic mode
- [ ] Select serial "X" in first form
- [ ] Verify serial "X" doesn't appear in second form dropdown
- [ ] Change serial in first form to "Y"
- [ ] Verify serial "X" now appears in second form, "Y" doesn't
- [ ] Test with manual UL selection mode
- [ ] Test with single UL (no exclusion needed)
- [ ] Verify database trigger still blocks duplicates if somehow bypassed

---

## Future Enhancements (Optional)

- Show excluded serials in dropdown but disabled with tooltip "Already selected for UL X"
- Add visual indicator showing which UL is using which serial
- Bulk serial assignment (select range of serials for multiple ULs at once)
