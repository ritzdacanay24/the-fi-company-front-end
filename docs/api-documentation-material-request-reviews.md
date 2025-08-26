# Material Request Detail Reviews - PHP CRUD API Documentation

## Overview
This document describes the comprehensive PHP CRUD API for managing multi-department reviews in the material request system. The API supports per-item approval/denial, assignment of items to multiple departments, tracking of review status, comments, and audit history.

## API Endpoints

### 1. Main CRUD Operations - `/igt_api/operations/material-request-detail/reviews.php`

#### GET - Retrieve Reviews
- **Get specific review by ID**: `GET /reviews.php?id={review_id}`
- **Get all reviews for an item**: `GET /reviews.php?mrf_det_id={item_id}`
- **Get reviews for a reviewer**: `GET /reviews.php?reviewer_id={user_id}`
- **Get reviews with filters**: `GET /reviews.php?department={dept}&review_status={status}&priority={priority}`
- **Get paginated reviews**: `GET /reviews.php?page={page}&limit={limit}`

**Response Format:**
```json
{
  "id": 1,
  "mrf_det_id": 123,
  "reviewerId": 456,
  "department": "Engineering",
  "reviewStatus": "pending_review",
  "reviewNote": "Please review for technical compliance",
  "reviewPriority": "high",
  "reviewDecision": null,
  "reviewComment": null,
  "sentForReviewAt": "2024-01-15 10:30:00",
  "reviewedAt": null,
  "sentForReviewBy": 789,
  "partNumber": "ABC-123",
  "description": "Sample Part",
  "qty": 5,
  "requestNumber": "MRF-2024-001",
  "reviewerFirstName": "John",
  "reviewerLastName": "Doe",
  "reviewerEmail": "john.doe@company.com",
  "sentByFirstName": "Jane",
  "sentByLastName": "Smith"
}
```

#### POST - Create New Review Assignment
```json
{
  "mrf_det_id": 123,
  "reviewerId": 456,
  "department": "Engineering",
  "sentForReviewBy": 789,
  "reviewNote": "Technical review required",
  "reviewPriority": "high",
  "reviewStatus": "pending_review"
}
```

#### PUT - Update Review
`PUT /reviews.php?id={review_id}`
```json
{
  "reviewStatus": "reviewed",
  "reviewDecision": "approved",
  "reviewComment": "Approved with conditions"
}
```

#### DELETE - Remove Review
- **Soft delete**: `DELETE /reviews.php?id={review_id}`
- **Hard delete**: `DELETE /reviews.php?id={review_id}&hard_delete=true`

### 2. Bulk Actions - `/igt_api/operations/material-request-detail/review-actions.php`

#### Bulk Assignment
```json
{
  "action": "bulk_assign",
  "items": [123, 124, 125],
  "assignments": [
    {
      "reviewerId": 456,
      "department": "Engineering",
      "reviewNote": "Technical review",
      "reviewPriority": "high"
    },
    {
      "reviewerId": 789,
      "department": "Quality",
      "reviewNote": "Quality check",
      "reviewPriority": "normal"
    }
  ],
  "sentForReviewBy": 999
}
```

#### Bulk Review
```json
{
  "action": "bulk_review",
  "reviewIds": [1, 2, 3],
  "decision": "approved",
  "comment": "All items approved",
  "reviewerId": 456
}
```

#### Department Summary
```json
{
  "action": "department_summary",
  "mrfId": 123
}
```

**Response:**
```json
{
  "departments": [
    {
      "department": "Engineering",
      "total_assigned": 5,
      "pending_count": 2,
      "approved_count": 2,
      "rejected_count": 1,
      "needs_info_count": 0,
      "reviewers": "John Doe, Jane Smith",
      "avg_priority": 2.5
    }
  ],
  "total_departments": 1
}
```

#### Escalate Review
```json
{
  "action": "escalate_review",
  "reviewId": 123,
  "newReviewerId": 789,
  "escalationReason": "Complex technical decision required",
  "escalatedBy": 456
}
```

#### Request Clarification
```json
{
  "action": "request_clarification",
  "reviewId": 123,
  "clarificationRequest": "Need more details about specifications"
}
```

## Database Schema

### mrf_det_reviews Table
```sql
CREATE TABLE mrf_det_reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mrf_det_id INT NOT NULL,
    reviewerId INT NOT NULL,
    department VARCHAR(100) NOT NULL,
    reviewStatus ENUM('pending_review', 'reviewed', 'needs_info') DEFAULT 'pending_review',
    reviewNote TEXT,
    reviewPriority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
    reviewDecision ENUM('approved', 'rejected', 'needs_clarification'),
    reviewComment TEXT,
    sentForReviewAt DATETIME,
    reviewedAt DATETIME,
    sentForReviewBy INT,
    active TINYINT(1) DEFAULT 1,
    createdDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    modifiedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_mrf_det_id (mrf_det_id),
    INDEX idx_reviewer_id (reviewerId),
    INDEX idx_department (department),
    INDEX idx_review_status (reviewStatus),
    INDEX idx_active (active),
    
    FOREIGN KEY (mrf_det_id) REFERENCES mrf_det(id),
    FOREIGN KEY (reviewerId) REFERENCES users(id),
    FOREIGN KEY (sentForReviewBy) REFERENCES users(id)
);
```

### Summary View - vw_mrf_det_with_reviews
```sql
CREATE VIEW vw_mrf_det_with_reviews AS
SELECT 
    md.*,
    COUNT(r.id) as review_count,
    COUNT(CASE WHEN r.reviewStatus = 'pending_review' THEN 1 END) as pending_reviews,
    COUNT(CASE WHEN r.reviewDecision = 'approved' THEN 1 END) as approved_reviews,
    COUNT(CASE WHEN r.reviewDecision = 'rejected' THEN 1 END) as rejected_reviews,
    GROUP_CONCAT(DISTINCT r.department) as review_departments,
    GROUP_CONCAT(DISTINCT CASE WHEN r.reviewStatus = 'pending_review' 
                 THEN CONCAT(u.firstName, ' ', u.lastName, ' (', r.department, ')') END) as pending_reviewers,
    CASE 
        WHEN COUNT(r.id) = 0 THEN 'no_reviews'
        WHEN COUNT(CASE WHEN r.reviewStatus = 'pending_review' THEN 1 END) > 0 THEN 'pending_review'
        WHEN COUNT(CASE WHEN r.reviewDecision = 'rejected' THEN 1 END) > 0 THEN 'rejected'
        WHEN COUNT(CASE WHEN r.reviewDecision = 'needs_clarification' THEN 1 END) > 0 THEN 'needs_clarification'
        ELSE 'approved'
    END as overall_review_status
FROM mrf_det md
LEFT JOIN mrf_det_reviews r ON md.id = r.mrf_det_id AND r.active = 1
LEFT JOIN users u ON r.reviewerId = u.id
GROUP BY md.id;
```

## Error Handling

All endpoints return appropriate HTTP status codes:
- **200**: Success
- **400**: Bad Request (missing parameters, invalid data)
- **404**: Not Found
- **405**: Method Not Allowed
- **500**: Internal Server Error

Error responses include a descriptive message:
```json
{
  "error": "Review not found"
}
```

## Security Features

1. **Input Validation**: All inputs are validated and sanitized
2. **Prepared Statements**: SQL injection protection
3. **Transaction Management**: Ensures data consistency
4. **Soft Deletes**: Maintains audit trail
5. **Access Control**: Reviewer ownership verification for updates

## Usage Examples

### Assigning Items for Review
```javascript
// Angular service call
this.multiDepartmentReview.bulkAssign({
  items: [123, 124],
  assignments: [
    { reviewerId: 456, department: 'Engineering', reviewPriority: 'high' }
  ],
  sentForReviewBy: currentUserId
}).subscribe(response => {
  console.log('Reviews assigned:', response.created_reviews);
});
```

### Getting Review Summary
```javascript
// Get department summary for a material request
this.multiDepartmentReview.getDepartmentSummary(mrfId)
  .subscribe(summary => {
    console.log('Department summary:', summary.departments);
  });
```

### Bulk Approval
```javascript
// Approve multiple items at once
this.multiDepartmentReview.bulkReview({
  reviewIds: [1, 2, 3],
  decision: 'approved',
  comment: 'All items meet requirements',
  reviewerId: currentUserId
}).subscribe(response => {
  console.log('Bulk approval completed:', response.total_updated);
});
```

## Integration with Angular Services

The API is designed to work seamlessly with the Angular services:
- `material-request-validation.service.ts`
- `multi-department-review.service.ts`

These services provide typed interfaces and handle HTTP communication with the PHP backend.
