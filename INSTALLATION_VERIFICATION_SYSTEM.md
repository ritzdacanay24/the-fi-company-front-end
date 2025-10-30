# Tablet Companion Verification - Installation Steps

## ✅ Files Created

### Backend Files:
1. **Database Migration:** `database/migrations/add_serial_verification_fields.sql`
2. **Session Management API:**
   - `backend/api/verification-session/create-session.php`
   - `backend/api/verification-session/get-session.php`
   - `backend/api/verification-session/update-session.php`
3. **Photo Verification API:** `backend/api/verify-serial/verify-photo.php`
4. **Tablet App:** `backend/tablet-companion.html`

### Frontend Files Updated:
1. **Service:** `src/app/features/serial-assignments/services/serial-assignments.service.ts`
   - Added 3 new methods: `createVerificationSession()`, `getVerificationSession()`, `updateVerificationSession()`

2. **Component:** `src/app/features/serial-assignments/serial-assignments.component.ts`
   - Added verification state management
   - Added polling mechanism
   - Added verification methods
   - Updated Actions column to include "Verify" button
   - Added new "Verification" status column

3. **Template:** `src/app/features/serial-assignments/serial-assignments.component.html`
   - Added verification modal with QR code display
   - Added success/failure result screens

### Documentation:
1. **Setup Guide:** `docs/tablet-companion-verification-setup.md`
2. **Angular Examples:** `docs/angular-verification-integration-example.ts` and `.html`

## 🚀 Installation Instructions

### Step 1: Run Database Migration

```sql
SOURCE c:/Users/rdacanay/Eyefi/modern/database/migrations/add_serial_verification_fields.sql
```

This creates:
- Verification columns in `serial_assignments` table
- `verification_sessions` table
- `verification_audit_log` table

### Step 2: Install Tesseract OCR

**Windows:**
1. Download from: https://github.com/UB-Mannheim/tesseract/wiki
2. Install to: `C:\Program Files\Tesseract-OCR`
3. Update path in `backend/api/verify-serial/verify-photo.php` (line ~129):
   ```php
   $tesseractPath = 'C:/Program Files/Tesseract-OCR/tesseract.exe';
   ```

Verify installation:
```bash
tesseract --version
```

### Step 3: Create Upload Directory

```bash
mkdir backend/uploads/verification-photos
```

Or PowerShell:
```powershell
New-Item -ItemType Directory -Path "backend/uploads/verification-photos" -Force
```

### Step 4: (Optional) Install QR Code Library

For real QR code display (currently using placeholder):

```bash
npm install angularx-qrcode
```

Then uncomment the QR code component in `serial-assignments.component.html` (around line 300).

### Step 5: Test the System

1. **Desktop:** Navigate to Serial Assignments page
2. Find an assignment that requires verification (IGT/ATI customer)
3. Click the **Verify** button (camera icon) in the Actions column
4. Modal opens showing session ID and placeholder QR code

5. **Tablet:** Open `http://YOUR_SERVER/backend/tablet-companion.html`
6. Enter the session ID from desktop
7. Point camera at a serial number label
8. Capture photo
9. Desktop automatically updates with verification result

## 📱 Tablet Setup

### Option A: Same Network
1. Find computer IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. On tablet browser: `http://YOUR_IP/backend/tablet-companion.html`

### Option B: Add to Home Screen
1. Open URL on tablet browser
2. **iOS:** Share → Add to Home Screen
3. **Android:** Menu → Add to Home Screen
4. App launches full-screen like native app!

## 🔧 Configuration

### Auto-Verification Rules

Edit `serial-assignments.component.ts` → `requiresVerification()` method to customize:

```typescript
requiresVerification(assignment: SerialAssignment): boolean {
  // Rule 1: High-value customers
  const highValueCustomers = ['IGT', 'ATI', 'Aristocrat'];
  if (assignment.customer_name && highValueCustomers.some(...)) {
    return true;
  }

  // Rule 2: Already flagged
  if (assignment.requires_verification) {
    return true;
  }

  // Add your custom rules here
  // Example: Work orders over $10,000
  // if (assignment.wo_value > 10000) return true;

  return false;
}
```

### OCR Engine

**Using Tesseract (Free):**
- 80-90% accuracy
- No API costs
- Already configured in `verify-photo.php`

**Upgrade to Mindee (Premium):**
- 95-99% accuracy
- ~$0.02 per scan
- Uncomment Mindee function in `verify-photo.php`
- Add API key from https://platform.mindee.com

## 🎯 Features Integrated

✅ Desktop creates verification session with QR code
✅ Real-time session expiration (5 minutes)
✅ Tablet captures photo with camera
✅ OCR extracts serial number automatically
✅ Desktop polls for updates every 1 second
✅ Sound feedback on success/failure
✅ Verification status badge in grid
✅ "Verify" button in Actions column
✅ Retry failed verifications
✅ Complete audit trail logging
✅ Photo storage on disk (not database)

## 📊 UI Changes

### New Grid Column:
**Verification** column shows:
- ✅ Verified (green)
- ❌ Failed (red)
- ⏱️ Pending (yellow)
- N/A (gray) - doesn't require verification

### New Actions Button:
**Verify** button (camera icon) appears for:
- Assignments requiring verification
- Failed verifications (retry)
- IGT/ATI customers
- Any assignment marked with `requires_verification = 1`

## 🧪 Testing Checklist

- [ ] Run migration SQL successfully
- [ ] Tesseract OCR installed and working
- [ ] Upload directory created with permissions
- [ ] Desktop: Click "Verify" button opens modal
- [ ] Desktop: Session ID displays
- [ ] Tablet: Can access tablet-companion.html
- [ ] Tablet: Can enter session ID and connect
- [ ] Tablet: Camera activates
- [ ] Tablet: Can capture photo
- [ ] Desktop: Receives verification result within 5 seconds
- [ ] Grid: Verification column shows status
- [ ] Grid: "Verify" button appears for IGT/ATI
- [ ] Sound plays on success/failure
- [ ] Failed verifications can be retried

## 🚨 Troubleshooting

### Issue: OCR returns "OCR_NOT_AVAILABLE"
**Solution:** Install Tesseract and update path in verify-photo.php

### Issue: Camera not working on tablet
**Solution:** Use HTTPS or grant camera permissions in browser

### Issue: Desktop doesn't update after photo capture
**Solution:** Check browser console for polling errors, verify API endpoints accessible

### Issue: "Verify" button doesn't appear
**Solution:** Ensure assignment is from 'serial_assignments' table (not legacy) and customer is IGT/ATI

## 📖 Next Steps

1. Deploy to production server
2. Train users on tablet workflow
3. Print test serial labels for practice
4. Consider upgrading to Mindee for better OCR accuracy
5. Add custom verification rules for your specific requirements

## 💡 Optional Enhancements

- Install real QR code generator (`angularx-qrcode`)
- Integrate barcode scanner as alternative input method
- Add bulk verification workflow UI
- Create verification reports/analytics
- Implement random audit sampling

---

**System is now fully integrated and ready for testing!** 🎉
