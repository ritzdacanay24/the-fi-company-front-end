# Tablet Companion Serial Verification System

## 🎯 Overview

This system enables **physical verification** of serial numbers using a tablet camera alongside your desktop application. It solves the problem of ensuring users actually photograph the correct physical serial numbers.

## 📋 Features

- **Desktop-Tablet Pairing**: QR code links desktop session to tablet
- **Live Camera Feed**: Tablet uses camera to photograph serial numbers
- **OCR Processing**: Automatically extracts serial from photo using Tesseract
- **Real-Time Verification**: Desktop receives instant verification results
- **Session Management**: 5-minute session timeout for security
- **Audit Trail**: Complete logging of all verification activities

## 🚀 Setup Instructions

### 1. Database Migration

Run the migration to add verification fields:

```sql
SOURCE c:/Users/rdacanay/Eyefi/modern/database/migrations/add_serial_verification_fields.sql
```

This creates:
- Verification columns in `serial_assignments` table
- `verification_sessions` table for session management
- `verification_audit_log` table for audit trail

### 2. Install Tesseract OCR

**Windows:**
1. Download installer: https://github.com/UB-Mannheim/tesseract/wiki
2. Run installer (recommended path: `C:\Program Files\Tesseract-OCR`)
3. Add to PATH or update `verify-photo.php` with full path:
   ```php
   $tesseractPath = 'C:/Program Files/Tesseract-OCR/tesseract.exe';
   ```

**macOS:**
```bash
brew install tesseract
```

**Linux:**
```bash
sudo apt-get install tesseract-ocr
```

Verify installation:
```bash
tesseract --version
```

### 3. Create Upload Directory

```bash
mkdir backend/uploads/verification-photos
chmod 755 backend/uploads/verification-photos
```

### 4. Tablet Setup

**Option A: Local Network**
1. Ensure tablet and computer are on same WiFi network
2. Find computer's IP address:
   - Windows: `ipconfig` → look for IPv4 Address
   - macOS/Linux: `ifconfig` → look for inet address
3. On tablet, open browser and go to:
   ```
   http://YOUR_COMPUTER_IP/backend/tablet-companion.html
   ```

**Option B: Add to Home Screen (Recommended)**
1. Open tablet-companion.html on tablet
2. Safari (iOS): Tap Share → Add to Home Screen
3. Chrome (Android): Tap Menu → Add to Home Screen
4. App will now launch full-screen like a native app!

## 📱 Usage Workflow

### Desktop (Angular App)

1. User selects serial numbers for assignment
2. System detects assignment requires verification (IGT/ATI customer, high-value order, etc.)
3. Click "Verify Serials" button
4. Desktop displays QR code with session ID
5. Desktop polls for verification updates every 1 second
6. When tablet completes verification:
   - ✅ Green checkmark if serial matches
   - ❌ Red X if mismatch detected
   - Photo thumbnail displayed

### Tablet (Companion App)

1. Open tablet-companion.html on tablet browser
2. Scan QR code or manually enter session ID
3. Tap "Connect" - camera activates
4. Point camera at physical serial number label
5. Tap "Capture Photo" when serial is clear
6. App auto-uploads photo to server
7. OCR extracts serial and validates
8. Result displayed instantly (match/mismatch)
9. Sound feedback (high beep = success, low beep = fail)
10. Tap "Verify Another Serial" to continue

## 🔧 Technical Architecture

### Backend APIs

**1. Create Session** (`create-session.php`)
- Generates unique session ID (UUID)
- Stores expected serial number
- Returns QR code data for tablet
- Sets 5-minute expiration

**2. Get Session** (`get-session.php`)
- Retrieves session details
- Checks expiration status
- Returns verification results

**3. Verify Photo** (`verify-photo.php`)
- Receives photo upload from tablet
- Saves image to disk
- Runs Tesseract OCR to extract serial
- Compares to expected value
- Updates session and assignment records
- Returns match/mismatch result

### Database Schema

**serial_assignments** (new columns):
- `requires_verification` - Boolean flag
- `verification_photo` - Image file path
- `verified_at` - Timestamp
- `verified_by` - Username
- `verification_session_id` - Links to session
- `verification_status` - pending/verified/failed/skipped

**verification_sessions** (new table):
- Session management
- Expected vs captured serial
- OCR results
- Match status

**verification_audit_log** (new table):
- Complete audit trail
- Tracks: session_created, photo_uploaded, ocr_completed, verification_completed

## 🎨 Angular Component Integration

### Step 1: Add to Serial Assignment Component

```typescript
// In serial-assignments.component.ts

verificationSessionId: string | null = null;
verificationStatus: 'pending' | 'verified' | 'failed' = 'pending';
pollingInterval: any = null;

async startVerification(assignmentId: number, expectedSerial: string) {
  try {
    const response = await this.http.post('/backend/api/verification-session/create-session.php', {
      assignment_id: assignmentId,
      expected_serial: expectedSerial,
      created_by: this.currentUser.username
    }).toPromise();

    if (response.success) {
      this.verificationSessionId = response.session.id;
      this.showQRCode(response.session.qr_data);
      this.startPolling();
    }
  } catch (error) {
    console.error('Failed to create verification session:', error);
  }
}

startPolling() {
  this.pollingInterval = setInterval(async () => {
    const response = await this.http.get(
      `/backend/api/verification-session/get-session.php?session_id=${this.verificationSessionId}`
    ).toPromise();

    if (response.success && response.session.match_result !== 'pending') {
      clearInterval(this.pollingInterval);
      this.verificationStatus = response.session.match_result === 'match' ? 'verified' : 'failed';
      this.showVerificationResult(response.session);
    }
  }, 1000); // Poll every second
}

showQRCode(qrData: string) {
  // Use a QR code library like angularx-qrcode
  // Display modal with QR code and session ID
}
```

### Step 2: Install QR Code Library

```bash
npm install angularx-qrcode
```

### Step 3: Add to Template

```html
<!-- verification-modal.component.html -->
<div class="verification-modal" *ngIf="verificationSessionId">
  <h2>Scan with Tablet</h2>
  
  <qrcode 
    [qrdata]="qrCodeData" 
    [width]="256" 
    [errorCorrectionLevel]="'M'">
  </qrcode>
  
  <p>Session ID: {{ verificationSessionId }}</p>
  
  <div *ngIf="verificationStatus === 'pending'" class="status-pending">
    <div class="spinner"></div>
    <p>Waiting for tablet verification...</p>
  </div>
  
  <div *ngIf="verificationStatus === 'verified'" class="status-success">
    <i class="fa fa-check-circle"></i>
    <p>Serial Verified Successfully!</p>
  </div>
  
  <div *ngIf="verificationStatus === 'failed'" class="status-error">
    <i class="fa fa-times-circle"></i>
    <p>Serial Mismatch Detected!</p>
    <p>Expected: {{ expectedSerial }}</p>
    <p>Captured: {{ capturedSerial }}</p>
  </div>
</div>
```

## 🔍 Testing Procedure

### Test 1: Basic Flow

1. Run migration SQL
2. Open desktop app → Serial Assignments
3. Create new assignment (use test serial like Q73908541)
4. Click "Verify" button
5. Desktop shows QR code
6. Open tablet-companion.html on phone/tablet
7. Enter session ID manually (or scan QR)
8. Tap Connect
9. Point camera at printed serial label
10. Tap Capture Photo
11. Verify OCR extracts correct serial
12. Desktop should update with verification result

### Test 2: Mismatch Detection

1. Follow Test 1 steps
2. When capturing photo, point camera at DIFFERENT serial
3. Verify system detects mismatch
4. Assignment should be marked as "failed"

### Test 3: Session Expiration

1. Create session on desktop
2. Wait 5+ minutes without tablet connecting
3. Try to connect with tablet
4. Should show "Session expired" error

### Test 4: Concurrent Sessions

1. Create 2 assignments requiring verification
2. Open 2 verification sessions simultaneously
3. Verify both can be processed independently
4. Each tablet upload goes to correct session

## 🚨 Troubleshooting

### OCR Not Working

**Problem:** Returns "OCR_NOT_AVAILABLE"

**Solution:**
1. Verify Tesseract installed: `tesseract --version`
2. Check path in verify-photo.php
3. Windows: Use full path to tesseract.exe
4. Check PHP can execute shell commands (safe_mode, exec)

### Camera Not Accessible

**Problem:** "Cannot access camera" error on tablet

**Solution:**
1. Ensure HTTPS or localhost (required for getUserMedia)
2. Grant camera permissions in browser
3. Check camera not in use by another app
4. Try different browser (Chrome/Safari)

### Upload Fails

**Problem:** Photo upload returns error

**Solution:**
1. Check upload directory exists and is writable
2. Verify PHP upload_max_filesize (should be ≥10MB)
3. Check POST permissions in .htaccess
4. Review PHP error logs

### QR Code Not Scanning

**Problem:** Session ID doesn't auto-populate from QR

**Solution:**
1. Use manual entry fallback (session ID displayed below QR)
2. Ensure QR data is valid JSON
3. Check QR code library generating correct format

## 💡 Advanced: Mindee Integration (Optional)

For **95-99% accuracy** (vs 80-90% with Tesseract), integrate Mindee:

1. Sign up at https://platform.mindee.com
2. Create custom serial number extraction model
3. Get API key
4. Uncomment Mindee function in verify-photo.php:

```php
// Replace extractSerialWithOCR() call with:
$ocrResult = extractSerialWithMindee($filepath);
```

5. Add API key:
```php
$apiKey = 'YOUR_MINDEE_API_KEY';
```

Cost: ~$0.02 per serial verification (very affordable)

## 📊 Auto-Verification Rules

Configure which assignments require verification:

```php
// In serial assignment logic
function requiresVerification($assignment) {
    // Rule 1: High-value customers (IGT, ATI)
    if (in_array($assignment['customer_name'], ['IGT', 'ATI'])) {
        return true;
    }
    
    // Rule 2: Work orders over $10,000
    if ($assignment['wo_value'] > 10000) {
        return true;
    }
    
    // Rule 3: New employees (first 30 days)
    $employeeStartDate = getEmployeeStartDate($assignment['assigned_by']);
    if (daysEmployed($employeeStartDate) < 30) {
        return true;
    }
    
    // Rule 4: Random sampling (20% of all assignments)
    if (rand(1, 100) <= 20) {
        return true;
    }
    
    return false;
}
```

## 🎯 Next Steps

1. ✅ Run database migration
2. ✅ Install Tesseract OCR
3. ✅ Test basic verification flow
4. 🔲 Integrate into Angular serial assignment component
5. 🔲 Add QR code display modal
6. 🔲 Configure auto-verification rules
7. 🔲 Train users on tablet workflow
8. 🔲 Optional: Integrate Mindee for production accuracy

## 🛠️ Hardware Recommendations

**Budget Option:**
- Amazon Fire HD 8 tablet ($60)
- Desktop computer with existing workflow

**Premium Option:**
- iPad 9th Gen ($329)
- USB barcode scanner as alternative ($50)

**Both Solutions Work!**
- Tablet: 5-10 seconds per serial with photo verification
- Barcode: 1 second per serial (requires one-time label printing)

Choose based on your workflow preference and budget.
