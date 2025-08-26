# Enhanced Material Request Validation System

## Overview
This enhanced validation system provides comprehensive per-item approval/denial and employee review workflows, similar to Jira's approval processes.

## Key Features

### 1. Per-Item Validation
- **Individual Approval/Rejection**: Each item can be approved or rejected independently
- **Required Rejection Comments**: Rejection requires a mandatory comment explaining the reason
- **Status Tracking**: Visual progress bar shows validation progress across all items
- **Audit Trail**: Tracks who validated each item and when

### 2. Employee Review Workflow
- **Send for Review**: Items can be sent to specific employees for additional review
- **Priority Levels**: Support for low, normal, high, and urgent priority levels
- **Review Instructions**: Add context and specific questions for reviewers
- **Email Notifications**: Reviewers receive email notifications with item details
- **Status Tracking**: Items show review status (None, Pending Review, Reviewed)

### 3. Bulk Operations
- **Select All/Deselect All**: Checkbox controls for bulk selection
- **Bulk Review Assignment**: Send multiple items to a reviewer at once
- **Progress Tracking**: Visual indicators show selection count and validation progress

### 4. Enhanced UI Features
- **Real-time Status Updates**: Badges show current validation and review status
- **Action Buttons**: Contextual buttons for approve, reject, comment, and send for review
- **Modal Workflow**: Professional modal interface for review assignment
- **Responsive Design**: Works across different screen sizes

## Database Schema

### New Fields Added to `material_request_details`
```sql
-- Validation fields
validationStatus ENUM('pending', 'approved', 'rejected') DEFAULT 'pending'
validationComment TEXT
validatedBy VARCHAR(50)
validatedAt DATETIME

-- Review workflow fields  
reviewStatus ENUM('none', 'pending_review', 'reviewed') DEFAULT 'none'
reviewerId VARCHAR(50)
reviewNote TEXT
reviewPriority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal'
sentForReviewAt DATETIME
sentForReviewBy VARCHAR(50)

-- Audit fields
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

## API Endpoints

### Material Request Detail API (`/igt_api/operations/material-request-detail/`)
- `GET` - Retrieve items with validation and review data
- `PUT` - Update validation status, comments, and review assignments
- `POST` - Create new items with validation fields
- `DELETE` - Remove items

### Validation Service Methods
- `approveItem(itemId, comment?)` - Approve an item
- `rejectItem(itemId, comment)` - Reject an item with required comment
- `sendForReview(assignment)` - Send items to employee for review
- `addComment(itemId, comment)` - Add comments to items
- `bulkApprove(itemIds, comment?)` - Bulk approve multiple items
- `bulkReject(itemIds, comment)` - Bulk reject multiple items

## Workflow Process

### Standard Validation
1. User opens material request for validation
2. Reviews each item individually
3. Approves or rejects items with comments
4. Progress bar shows completion status
5. All items must be processed before sending to picking

### Employee Review Process
1. User selects items that need additional review
2. Assigns items to specific reviewer with priority and instructions
3. Reviewer receives email notification
4. Items marked as "Pending Review" until reviewer responds
5. Reviewer can approve, reject, or request more information
6. Original validator sees review status and can take final action

## Benefits

### Similar to Jira
- **Assignee System**: Like Jira tickets, items can be assigned to specific reviewers
- **Status Workflow**: Clear status progression (Pending → Under Review → Approved/Rejected)
- **Comments System**: Comments and notes for collaboration
- **Priority Levels**: Priority system for urgent items
- **Email Notifications**: Automatic notifications like Jira

### Improved Efficiency
- **Parallel Processing**: Multiple items can be processed simultaneously
- **Bulk Operations**: Reduce repetitive actions
- **Clear Visibility**: Everyone knows the status of each item
- **Audit Trail**: Complete history of who did what and when

### Quality Control
- **Mandatory Comments**: Rejections require explanations
- **Peer Review**: Complex items can get additional review
- **Expert Input**: Subject matter experts can be brought in for specific items
- **Standardized Process**: Consistent workflow across all validations

## Usage Instructions

1. **Open Material Request**: Navigate to the validation screen
2. **Review Items**: Examine each part number, description, and quantity
3. **Take Actions**: Use action buttons to approve, reject, comment, or send for review
4. **Track Progress**: Monitor the progress bar and status badges
5. **Bulk Operations**: Use checkboxes for bulk actions when appropriate
6. **Complete Validation**: Process all items before sending to picking

This system provides enterprise-level workflow management while maintaining ease of use and clear visibility into the validation process.
