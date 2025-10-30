# Mismatch Report System Implementation

## Overview
This document describes the complete implementation of the Serial Number Sequence Mismatch Reporting System, which enables users to report discrepancies and admins to investigate root causes.

## System Architecture

### Frontend Components

#### 1. Report Submission Modal
**Location:** `eyefi-serial-workflow.component.html` (mismatchReportModal template)

**Features:**
- Auto-captures context (Work Order, User, Timestamp)
- Row selection dropdown
- Side-by-side comparison (Expected vs Physical)
- Optional photo upload with preview
- Contact preference selection
- Form validation

#### 2. Workflow Integration
**Location:** `eyefi-serial-workflow.component.html` (Step 4)

**Features:**
- Red alert box for NEW category
- Prominent "Report Sequence Mismatch" button
- Clear instructions on what to do when mismatch found

### Backend API

#### API Endpoints

**Base URL:** `/api/eyefi-serial-mismatch`

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/submit` | Submit new mismatch report | Authenticated |
| GET | `/reports` | Get all reports (with filters) | Admin |
| GET | `/reports/{id}` | Get single report details | Admin |
| PUT | `/reports/{id}/status` | Update investigation status | Admin |
| GET | `/summary` | Get dashboard statistics | Admin |
| POST | `/reports/{id}/notify` | Send notifications | Admin |

#### Database Schema

**Table:** `eyefi_serial_mismatch_reports`

```sql
Columns:
- id (PK)
- work_order_number
- category ('new' or 'used')
- reported_by / reported_by_user_id
- row_index / row_number
- expected_eyefi_serial / expected_ul_number
- physical_eyefi_serial / physical_ul_number
- notes
- photo_base64
- contact_method / contact_info
- status ('reported', 'investigating', 'resolved', 'cancelled')
- investigated_by / investigated_by_user_id
- investigation_notes
- resolution_action
- root_cause
- created_at / resolution_date / updated_at
```

**Views:**
- `v_mismatch_report_summary` - Status counts and averages
- `v_mismatch_root_cause_analysis` - Root cause distribution

## User Workflow

### Step 1: Detect Mismatch
User notices physical device serial doesn't match system sequence

### Step 2: Stop Work
User stops the workflow and doesn't proceed to submission

### Step 3: Open Report Modal
Click "Report Sequence Mismatch" button in red alert box

### Step 4: Fill Report
- Select row number with mismatch
- System shows expected values
- User enters physical values
- Optional: Add notes and photo
- Select contact method

### Step 5: Submit Report
System captures all data and sends notification to admins

### Step 6: Wait for Resolution
User waits at workstation or leaves contact info
Admin investigates and contacts user when resolved

## Admin Dashboard (To Be Implemented)

### Dashboard Features

#### Statistics Cards
- Total Reports (with trend)
- Reports by Status (pie chart)
- Average Resolution Time
- Root Cause Distribution

#### Recent Reports Table
Columns:
- Report ID
- Work Order
- Reported By
- Row #
- Expected vs Physical
- Status
- Created Date
- Actions (View, Investigate, Resolve)

#### Filters
- Status dropdown
- Work Order search
- Date range picker
- Root cause filter

### Report Detail View

#### Information Sections
1. **Report Summary**
   - Report ID, Status badge
   - Work Order with link
   - Reported by (with photo)
   - Timestamp
   - Contact method

2. **Mismatch Comparison**
   - Side-by-side table
   - Expected (green) vs Physical (red)
   - Highlighting differences

3. **Photo Evidence**
   - Full-size image viewer
   - Download option
   - Zoom capability

4. **Investigation Section**
   - Status dropdown
   - Root cause selection
   - Investigation notes textarea
   - Resolution action textarea
   - Update button

5. **Activity Timeline**
   - Report created
   - Status changes
   - Comments added
   - Final resolution

### Investigation Actions

#### Status Transitions
```
reported → investigating → resolved
                      ↓
                  cancelled
```

#### Root Cause Options
- `receiving_error` - Incorrect data entry during receiving
- `mislabeling` - Physical label doesn't match device
- `already_consumed` - Serial marked available but already used
- `physical_wrong_order` - Inventory stored out of sequence
- `duplicate` - Same serial entered twice
- `other` - Other causes (describe in notes)

#### Resolution Actions
Examples of what admin documents:
- "Updated serial S12345 status to consumed"
- "Physically reorganized inventory bins A1-A5"
- "Created new serial record for correct device"
- "Merged duplicate records, kept ID #456"
- "Corrected receiving error in WO-789"

## Email Notifications

### New Report Notification
**Recipients:** All admins
**Subject:** URGENT: Serial Number Sequence Mismatch - WO {number}
**Content:**
- Report ID and link
- Work Order details
- Reported by info
- Expected vs Physical comparison table
- Notes and contact info
- "View Full Report" button

### Resolution Notification
**Recipients:** Original reporter
**Subject:** Resolved: Serial Number Sequence Mismatch Report #{id}
**Content:**
- Report status update
- Root cause identified
- Resolution action taken
- Next steps (can continue workflow, need to restart, etc.)

## Frontend Code Examples

### Opening Report Modal
```typescript
openMismatchReportModal() {
  this.mismatchReport = {
    workOrderNumber: this.workOrderNumber,
    category: this.category,
    reportedBy: this.authenticatedUser?.name || '',
    reportedByUserId: this.authenticatedUser?.id,
    timestamp: new Date(),
    rowIndex: null,
    physicalEyefiSerial: '',
    physicalUlNumber: '',
    contactMethod: 'workstation'
  };
  
  this.modalService.open(this.mismatchReportModal, { size: 'lg' });
}
```

### Submitting Report
```typescript
submitMismatchReport() {
  this.isSubmittingMismatch = true;
  
  // Set expected values based on selected row
  const assignment = this.serialAssignments[this.mismatchReport.rowIndex!];
  this.mismatchReport.expectedEyefiSerial = assignment.serial?.serial_number || assignment.serial;
  this.mismatchReport.expectedUlNumber = assignment.ulNumber?.ul_number;
  
  this.mismatchService.submitReport(this.mismatchReport)
    .subscribe({
      next: (response) => {
        this.toastr.success(response.message);
        this.modalService.dismissAll();
        this.isSubmittingMismatch = false;
      },
      error: (error) => {
        this.toastr.error('Failed to submit report');
        this.isSubmittingMismatch = false;
      }
    });
}
```

### Photo Upload
```typescript
onMismatchPhotoSelected(event: any) {
  const file = event.target.files[0];
  if (file && file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.mismatchReport.photoPreview = e.target.result;
      this.mismatchReport.photoBase64 = e.target.result;
    };
    reader.readAsDataURL(file);
  }
}
```

## Backend Code Examples

### Submitting Report (PHP)
```php
function submitReport($db, $currentUser) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $stmt = $db->prepare("
        INSERT INTO eyefi_serial_mismatch_reports 
        (work_order_number, reported_by, ...)
        VALUES (:work_order, :reported_by, ...)
    ");
    
    $stmt->execute([...]);
    $reportId = $db->lastInsertId();
    
    sendMismatchNotification($db, $reportId, $data, $currentUser);
    
    return ['success' => true, 'reportId' => $reportId];
}
```

### Getting Summary Statistics
```php
function getSummary($db, $currentUser) {
    // Status counts
    $statusCounts = $db->query("
        SELECT COUNT(*) as total,
               SUM(CASE WHEN status = 'reported' THEN 1 ELSE 0 END) as reported,
               ...
        FROM eyefi_serial_mismatch_reports
    ")->fetch();
    
    // Root cause distribution
    $rootCauses = $db->query("
        SELECT root_cause, COUNT(*) as count
        FROM eyefi_serial_mismatch_reports
        WHERE root_cause IS NOT NULL
        GROUP BY root_cause
    ")->fetchAll();
    
    // Average resolution time
    $avgTime = $db->query("
        SELECT AVG(DATEDIFF(HOUR, created_at, resolution_date)) as avg_hours
        FROM eyefi_serial_mismatch_reports
        WHERE status = 'resolved'
    ")->fetch();
    
    return [
        'totalReports' => $statusCounts['total'],
        'byStatus' => [...],
        'byRootCause' => [...],
        'averageResolutionTimeHours' => $avgTime['avg_hours']
    ];
}
```

## Testing Checklist

### User Testing
- [ ] Report modal opens correctly
- [ ] Row selection populates expected values
- [ ] Photo upload shows preview
- [ ] Form validation works
- [ ] Submission shows success message
- [ ] Can't proceed workflow after reporting

### Admin Testing
- [ ] Can view all reports
- [ ] Filters work correctly
- [ ] Can update investigation status
- [ ] Email notifications sent
- [ ] Dashboard statistics accurate
- [ ] Can download photos

### Integration Testing
- [ ] Report links to correct work order
- [ ] User info captured correctly
- [ ] Timestamps accurate
- [ ] Database records created
- [ ] Views return correct data

## Metrics to Track

### Key Performance Indicators (KPIs)
1. **Response Time** - Time from report to first admin action
2. **Resolution Time** - Time from report to resolved status
3. **Report Volume** - Number of reports per week/month
4. **Root Cause Distribution** - Which issues are most common
5. **Resolution Rate** - Percentage of reports resolved vs cancelled

### Success Metrics
- Average resolution time < 2 hours
- 95% of reports resolved within 24 hours
- Declining trend in repeat root causes
- User satisfaction with investigation process

## Future Enhancements

### Phase 2
- [ ] Real-time notifications (WebSocket)
- [ ] Mobile app integration
- [ ] Barcode scanner for physical serial entry
- [ ] AI-assisted root cause prediction
- [ ] Automated resolution for common issues

### Phase 3
- [ ] Predictive analytics dashboard
- [ ] Pattern detection (recurring issues)
- [ ] Integration with receiving system
- [ ] Automated physical inventory reordering
- [ ] QR code generation for reports

## Deployment Steps

1. **Run database migration**
   ```sql
   -- Execute: database/migrations/create_mismatch_reports_table.sql
   ```

2. **Deploy backend API**
   ```bash
   # Copy: backend/api/eyefi-serial-mismatch.php
   ```

3. **Build and deploy frontend**
   ```bash
   npm run build
   ```

4. **Configure email settings**
   - Update SMTP settings in backend
   - Set admin email addresses

5. **Test in staging**
   - Submit test report
   - Verify email delivery
   - Check admin dashboard

6. **Deploy to production**
   - Monitor first reports
   - Gather user feedback
   - Adjust as needed

## Support and Maintenance

### User Support
- **Documentation:** Link to this guide
- **Training:** Hands-on session for floor users
- **Help Desk:** IT extension for report issues

### Admin Support
- **Training:** Root cause investigation methods
- **SOPs:** Standard operating procedures for common issues
- **Escalation:** When to involve database admin

### System Maintenance
- **Weekly:** Review open reports, send reminders
- **Monthly:** Generate analytics report
- **Quarterly:** Review KPIs, identify trends
- **Annually:** System audit and optimization

## Contact Information

**System Owner:** IT Department
**Database Admin:** [Name] - [Email]
**Support:** helpdesk@company.com

## Revision History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-01-23 | 1.0 | Initial implementation | Development Team |

