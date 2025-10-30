# Workflow-Verification Tracking Implementation

## Problem Statement
Currently, verification sessions are not properly linked to the workflow, making it impossible to:
1. Show which specific serial was verified in which photo
2. Prevent duplicate verifications of the same batch
3. Track verification history per serial number
4. Display per-serial verification status in the UI

## Solution Architecture

### Database Schema Changes

```sql
-- serial_assignments table
ALTER TABLE serial_assignments ADD COLUMN workflow_session_id VARCHAR(36);
ALTER TABLE serial_assignments ADD COLUMN verified_in_photo INT;
ALTER TABLE serial_assignments ADD COLUMN verification_detail_id INT;

-- verification_sessions table  
ALTER TABLE verification_sessions ADD COLUMN workflow_session_id VARCHAR(36);

-- NEW: serial_verification_details table
CREATE TABLE serial_verification_details (
    id INT PRIMARY KEY AUTO_INCREMENT,
    verification_session_id VARCHAR(36),
    assignment_id INT,
    serial_number VARCHAR(50),
    serial_type ENUM('eyefi', 'ul'),
    photo_number INT,
    captured_at TIMESTAMP,
    verified_by VARCHAR(100)
);
```

### Workflow Changes

#### Step 1: Initialize Workflow Session (BEFORE Step 1 loads)

```typescript
// eyefi-serial-workflow.component.ts

async ngOnInit() {
    // Generate workflow session ID when component loads
    this.workflowSessionId = this.generateUUID();
    console.log('Workflow Session ID:', this.workflowSessionId);
}

// When user adds serials (Step 3), store workflow_session_id
async addSerialToAssignments(serial: any) {
    const assignment = {
        serial: serial,
        workflow_session_id: this.workflowSessionId, // Add this!
        verified: false,
        // ...other fields
    };
    this.serialAssignments.push(assignment);
}
```

#### Step 2: Pass workflow_session_id to Verification

```typescript
// When creating verification session
async startBatchVerification(): Promise<void> {
    const sessionResponse = await this.serialAssignmentsService.createVerificationSession(
        0, // assignment_id
        unverifiedSerials,
        this.currentUser?.name || 'User',
        ulNumber,
        this.workflowSessionId // Add this parameter!
    );
}
```

#### Step 3: Update Backend to Store Relationships

```php
// create-session.php
$workflowSessionId = $data['workflow_session_id'] ?? null;

$insertStmt = $db->prepare("
    INSERT INTO verification_sessions 
    (id, assignment_id, expected_serials, workflow_session_id, ...)
    VALUES (?, ?, ?, ?, ...)
");
$insertStmt->execute([$sessionId, $assignmentId, $expectedSerialsJson, $workflowSessionId, ...]);
```

#### Step 4: Track Individual Serial Verifications

```php
// submit-photo.php - After extracting serials

foreach ($newMatches as $extracted) {
    // Determine serial type
    $serialType = (strpos($extracted, 'T') === 0) ? 'ul' : 'eyefi';
    
    // Insert detail record
    $detailStmt = $db->prepare("
        INSERT INTO serial_verification_details
        (verification_session_id, serial_number, serial_type, photo_number, verified_by)
        VALUES (?, ?, ?, ?, 'tablet')
    ");
    $detailStmt->execute([$sessionId, $extracted, $serialType, count($photos)]);
    $detailId = $db->lastInsertId();
    
    // Update serial_assignments if it exists
    if ($workflowSessionId) {
        $updateStmt = $db->prepare("
            UPDATE serial_assignments
            SET verified = 1,
                verified_at = NOW(),
                verified_in_photo = ?,
                verification_detail_id = ?,
                verification_session_id = ?
            WHERE workflow_session_id = ?
            AND (eyefi_serial_number = ? OR ul_number = ?)
        ");
        $updateStmt->execute([
            count($photos),
            $detailId, 
            $sessionId,
            $workflowSessionId,
            $extracted,
            $extracted
        ]);
    }
}
```

### UI Changes

#### Display Per-Serial Verification Status

```html
<!-- eyefi-serial-workflow.component.html -->
<tr *ngFor="let assignment of serialAssignments; let i = index">
    <td>{{ assignment.serial?.serial_number }}</td>
    <td>{{ assignment.ulNumber?.ul_number }}</td>
    
    <!-- Show verification status per serial -->
    <td>
        <span *ngIf="assignment.verified" class="badge badge-success">
            ✓ Verified (Photo {{ assignment.verified_in_photo }})
        </span>
        <span *ngIf="!assignment.verified" class="badge badge-warning">
            Pending
        </span>
    </td>
</tr>
```

#### Show Verification Button at Workflow Start

```html
<!-- Add button BEFORE Step 1 -->
<div class="workflow-header">
    <h2>EyeFi Serial Assignment Workflow</h2>
    <p>Workflow Session: {{ workflowSessionId }}</p>
    
    <button *ngIf="!verificationStarted" 
            (click)="initializeVerificationSession()"
            class="btn btn-primary">
        🔐 Start Verification Session
    </button>
</div>
```

## Benefits

✅ **Track Individual Serials**: Know exactly which photo captured which serial
✅ **Prevent Duplicates**: Can check if workflow_session_id already has verification
✅ **Resume Capability**: Can resume partial verifications
✅ **Audit Trail**: Complete history of which user verified what and when
✅ **Better UX**: Show per-serial verification status in UI
✅ **Reporting**: Can generate reports of verification efficiency

## Implementation Steps

1. ✅ Run database migration (add_workflow_verification_tracking.sql)
2. ⏳ Update Angular component to generate workflow_session_id
3. ⏳ Pass workflow_session_id to create-session.php
4. ⏳ Update submit-photo.php to record serial_verification_details
5. ⏳ Update get-session.php to return per-serial status
6. ⏳ Update UI to show per-serial verification badges
7. ⏳ Add "Start Verification" button at workflow start

## Example Data Flow

```
Workflow Start:
  workflow_session_id = "abc-123-def"
  
Step 3 - Add Serials:
  serial_assignments:
    - id: 1, serial: "147241", workflow_session_id: "abc-123-def", verified: false
    - id: 2, serial: "147242", workflow_session_id: "abc-123-def", verified: false
    
Step 4 - Start Verification:
  verification_sessions:
    - id: "xyz-789", workflow_session_id: "abc-123-def", expected_serials: ["147241", "147242"]
    
Photo 1 Captured (finds 147241):
  serial_verification_details:
    - id: 1, session: "xyz-789", serial: "147241", photo_number: 1
  
  serial_assignments:
    - id: 1, verified: true, verified_in_photo: 1, verification_detail_id: 1 ✓
    
Photo 2 Captured (finds 147242):
  serial_verification_details:
    - id: 2, session: "xyz-789", serial: "147242", photo_number: 2
  
  serial_assignments:
    - id: 2, verified: true, verified_in_photo: 2, verification_detail_id: 2 ✓
```

This creates a complete audit trail and links everything together!
