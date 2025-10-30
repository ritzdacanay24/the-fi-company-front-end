# EyeFi Serial Verification System - Workflow Integration

## Overview
Physical serial number verification has been integrated into the `eyefi-serial-workflow` component at **Step 4: Assign Serials & UL Numbers**. This ensures that pre-loaded serial numbers match the physical devices before proceeding to asset generation.

## What Gets Verified
The system verifies **all pre-loaded serials** in NEW category:
1. **EyeFi Serial Numbers** - Auto-selected from sequence
2. **UL Label Numbers** - Auto-selected from sequence

## When Verification is Required
Verification is **mandatory** for:
- **ALL CUSTOMERS** when using **NEW category** (pre-loaded serials)
- **USED category**: Verification **NOT REQUIRED** (manual entry, no sequence)

### Why Universal Verification?
Since EyeFi serials and UL labels are automatically pre-loaded from sequence for **all customers**, physical verification ensures:
- The physical device matches the system's auto-selected serial
- Prevents sequence mismatches that could cause tracking errors
- Catches mislabeled or incorrectly received inventory
- Maintains data integrity across all customer types

## Implementation Details

### Component Changes (`eyefi-serial-workflow.component.ts`)

#### 1. New Imports
```typescript
import { SerialAssignmentsService } from '@app/features/serial-assignments/services/serial-assignments.service';
import { interval, Subscription } from 'rxjs';
```

#### 2. Verification Interfaces
```typescript
interface VerificationSession {
  session_id: string;
  serial_assignment_id?: number;
  expected_serial: string;
  expected_ul?: string;
  status: 'pending' | 'verified' | 'failed' | 'expired';
  created_at: string;
  expires_at: string;
}

interface VerificationResult {
  success: boolean;
  verified: boolean;
  matched: boolean;
  message?: string;
}
```

#### 3. Verification State Properties
```typescript
// Verification state
currentVerificationSession: VerificationSession | null = null;
currentVerificationIndex: number | null = null;
verificationStatus: string = '';
isVerifying: boolean = false;
showVerificationModal: boolean = false;
verificationPollingSubscription: Subscription | null = null;
verificationSessionTimer: any = null;
verificationSessionExpiry: Date | null = null;
verificationProgress: { current: number; total: number } = { current: 0, total: 0 };
```

#### 4. Serial Assignment Extended
```typescript
serialAssignments: Array<{
  serial: any;
  ulNumber: any;
  isAutoPopulated: boolean;
  manuallyChanged: boolean;
  isEditing: boolean;
  verified: boolean; // ✅ NEW
  verificationStatus?: 'pending' | 'verified' | 'failed'; // ✅ NEW
  verificationPhoto?: string; // ✅ NEW
  verifiedAt?: Date; // ✅ NEW
  verifiedBy?: string; // ✅ NEW
}> = [];
```

#### 5. Key Methods

**Check if verification required:**
```typescript
requiresVerification(): boolean {
  // Verification required for ALL customers in NEW category
  // since EyeFi serials and UL labels are pre-loaded and need physical confirmation
  return this.category === 'new';
}
```

**Check if all serials verified:**
```typescript
allSerialsVerified(): boolean {
  if (!this.requiresVerification()) {
    return true; // No verification required
  }
  return this.serialAssignments.every(a => a.verified === true);
}
```

**Start batch verification:**
```typescript
async startBatchVerification(): Promise<void> {
  // Set up progress tracking
  this.verificationProgress = {
    current: 0,
    total: this.serialAssignments.length
  };

  // Find first unverified serial
  const startIndex = this.serialAssignments.findIndex(a => !a.verified);
  if (startIndex === -1) {
    this.toastrService.info('All serials already verified');
    return;
  }

  // Start verification for first unverified serial
  await this.verifySerial(startIndex);
}
```

**Verify single serial:**
```typescript
async verifySerial(index: number): Promise<void> {
  // 1. Create verification session
  // 2. Show QR code modal
  // 3. Start polling for result
  // 4. Handle success/failure
  // 5. Move to next unverified serial
}
```

**Block Step 5 progression:**
```typescript
canProceedToNextStep(): boolean {
  switch (this.currentStep) {
    case 4:
      const allFilled = /* ... check all serials filled ... */;
      
      // For NEW category (pre-loaded serials), require verification for ALL customers
      // USED category doesn't require verification (manual entry)
      if (this.category === 'new') {
        return allFilled && this.allSerialsVerified();
      }
      
      return allFilled;
    // ... other cases
  }
}
```

### Template Changes (`eyefi-serial-workflow.component.html`)

#### 1. Verification Status Column Added to Table
```html
<thead class="table-light">
  <tr>
    <th style="width: 50px;">#</th>
    <th>EyeFi Serial Number</th>
    <th>UL Label Number</th>
    <th *ngIf="requiresVerification() && category === 'new'" style="width: 120px;">Verification</th>
  </tr>
</thead>
<tbody>
  <tr *ngFor="let assignment of serialAssignments; let i = index">
    <!-- ... serial and UL columns ... -->
    
    <!-- Verification Status -->
    <td *ngIf="requiresVerification() && category === 'new'" class="text-center align-middle">
      <span *ngIf="assignment.verified" class="badge bg-success">
        <i class="mdi mdi-check-circle"></i> Verified
      </span>
      <span *ngIf="!assignment.verified && assignment.verificationStatus === 'failed'" class="badge bg-danger">
        <i class="mdi mdi-close-circle"></i> Failed
      </span>
      <span *ngIf="!assignment.verified && !assignment.verificationStatus" class="badge bg-warning">
        <i class="mdi mdi-clock-outline"></i> Pending
      </span>
    </td>
  </tr>
</tbody>
```

#### 2. Verification Alert Panel
Shows for **ALL customers in NEW category**:
- **Progress bar** showing verified count
- **"Start Verification"** button to begin batch verification
- **"Continue Verification"** button if some already verified
- **Info message** explaining verification is required before Step 5

#### 3. Verification Modal
Full-screen modal that displays:
- **Progress indicator** (e.g., "Verifying 2 of 10")
- **Current serial details** (EyeFi Serial + UL Label)
- **QR Code** for tablet to scan
- **Status message** (waiting, verified, failed, expired)
- **Session timer** (5-minute countdown)
- **Action buttons**:
  - Close/Cancel
  - Try Again (on failure)
  - Report Mismatch (on mismatch)
  - Skip (not recommended)

## User Workflow

### Desktop App (Step 4):
1. **Serials auto-populated** from sequence
2. **User clicks** "Start Verification" button
3. **Modal opens** showing QR code
4. **System creates** verification session (5-minute expiry)
5. **Polls every second** for verification result
6. **On success**: Mark serial verified, move to next
7. **On mismatch**: Show error, allow report
8. **On failure/expire**: Show retry button

### Tablet App:
1. **Scan QR code** from desktop modal
2. **Open camera** interface
3. **Point at physical serial** number label
4. **Capture photo**
5. **System extracts** serial via OCR (Tesseract)
6. **Compares** extracted vs expected
7. **Uploads result** to server
8. **Desktop receives** result automatically

## Backend Requirements

### Already Implemented:
- ✅ Verification session management APIs
- ✅ Photo upload & OCR processing
- ✅ Tablet companion HTML app
- ✅ Database schema with verification fields

### Needs Installation:
1. **Run database migration:**
   ```sql
   SOURCE c:/Users/rdacanay/Eyefi/modern/database/migrations/add_serial_verification_fields.sql
   ```

2. **Install Tesseract OCR:**
   - Download: https://github.com/UB-Mannheim/tesseract/wiki
   - Install to: `C:\Program Files\Tesseract-OCR`
   - Update path in `backend/api/verify-serial/verify-photo.php`

3. **Create upload directory:**
   ```powershell
   New-Item -ItemType Directory -Path "backend/uploads/verification-photos" -Force
   ```

4. **Optional: Install QR Code library:**
   ```bash
   npm install angularx-qrcode --save
   ```
   Then update modal template to use `<qrcode>` component instead of placeholder

## Testing Checklist

### End-to-End Test:
1. ☐ Select **any customer** (Light and Wonder, AGS, IGT, etc.)
2. ☐ Configure batch (**NEW category**, quantity 3)
3. ☐ Proceed to Step 4
4. ☐ Verify serials auto-populated
5. ☐ See "Physical Verification Required" alert (for ALL NEW batches)
6. ☐ Click "Start Verification"
7. ☐ Modal opens with QR code
8. ☐ Session timer counts down
9. ☐ Open tablet app (scan QR or manual URL)
10. ☐ Capture photo of physical serial
11. ☐ Desktop receives result automatically
12. ☐ Serial marked verified ✓
13. ☐ Modal auto-advances to next serial
14. ☐ Repeat until all verified
15. ☐ "Next Step" button enabled
16. ☐ Proceed to Step 5

### Error Scenarios:
- ☐ Session expires (5 minutes) → Show retry button
- ☐ Serial mismatch → Show error, allow report
- ☐ OCR fails → Show retry button
- ☐ Network error → Show retry button
- ☐ Skip verification → Warning message

## Configuration

### Enable/Disable Verification by Category:
Verification is currently tied to category in `requiresVerification()`:
```typescript
requiresVerification(): boolean {
  // Verification required for ALL customers in NEW category
  return this.category === 'new';
}
```

To disable verification entirely (not recommended):
```typescript
requiresVerification(): boolean {
  return false; // WARNING: Disables all verification
}
```

To add customer-specific rules:
```typescript
requiresVerification(): boolean {
  // NEW category always requires verification
  if (this.category === 'new') {
    return true;
  }
  
  // Optionally require for specific customers in USED category
  const alwaysVerifyCustomers = ['IGT', 'ATI'];
  return alwaysVerifyCustomers.includes(this.selectedCustomer.toUpperCase());
}
```

### Adjust Session Timeout:
Backend API (`create-session.php`) sets 5-minute expiry:
```php
$expiresAt = date('Y-m-d H:i:s', strtotime('+5 minutes'));
```

## Benefits

1. **Prevents Costly Errors**: Physical verification catches sequence mismatches before assets are generated
2. **Universal Quality Control**: ALL customers benefit from verification, not just high-value accounts
3. **Sequence Integrity**: Ensures pre-loaded serials match physical devices for accurate inventory tracking
4. **Audit Trail**: Photos and verification records stored for compliance
5. **Blocking Progression**: Cannot proceed to Step 5 until all serials verified (NEW category only)
6. **Mobile-Friendly**: Tablet camera interface for field workers
7. **Automatic Workflow**: Polls for results, auto-advances to next serial
8. **Error Handling**: Retry, skip, and mismatch reporting built-in

## Future Enhancements

1. **Real QR Code**: Install `angularx-qrcode` to display actual QR codes
2. **Sound Feedback**: Add success/error audio cues
3. **Batch QR Code**: Single QR code for entire batch (tablet tracks progress)
4. **Offline Support**: Cache verification data, sync when online
5. **Better OCR**: Upgrade to Mindee API for 95%+ accuracy (vs 80-90% Tesseract)
6. **Multi-User**: Multiple tablets verifying simultaneously
7. **Verification History**: View past verifications in dashboard

## Support & Troubleshooting

### Common Issues:

**"Verification session expired"**
- Session timeout is 5 minutes
- Click "Try Again" to create new session
- Ensure tablet worker is ready before starting

**"Physical serial doesn't match"**
- Click "Report Mismatch" button
- Admin will investigate root cause
- Do NOT skip or bypass verification

**QR code not scanning**
- Ensure good lighting
- Increase tablet screen brightness
- Try manual URL entry instead

**OCR not detecting serial**
- Ensure photo is clear and focused
- Serial number must be visible
- Try different angle or lighting

### Admin Actions:

1. **View verification reports**: Check `verification_audit_log` table
2. **Check mismatch reports**: Use existing mismatch reporting system
3. **Fix sequence issues**: Update serial availability views
4. **Review photos**: Check `backend/uploads/verification-photos/`

## Related Documentation

- `INSTALLATION_VERIFICATION_SYSTEM.md` - Installation guide
- `docs/tablet-companion-verification-setup.md` - Tablet setup guide
- `EYEFI_SERIAL_STRICT_MODE_ENFORCEMENT.md` - Serial sequence rules
- `MISMATCH_REPORT_SYSTEM.md` - Mismatch reporting guide

---

**Status**: ✅ Integration Complete - Ready for Testing
**Last Updated**: {{ current_date }}
**Author**: GitHub Copilot AI Assistant
