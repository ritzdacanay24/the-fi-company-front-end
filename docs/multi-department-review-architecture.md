# Multi-Department Review Architecture

## Recommended Approach: Hybrid Solution

After analyzing your `mrf_det` table structure and the requirement for multi-department reviews, I recommend this **hybrid approach**:

### ✅ **1. Extend Existing `mrf_det` Table**
Add basic validation fields to your existing table:
```sql
ALTER TABLE mrf_det ADD:
- validationStatus ENUM('pending', 'approved', 'rejected') 
- validationComment TEXT
- validatedBy INT(11)
- validatedAt DATETIME
```

### ✅ **2. Create Separate Review Table**
Handle multi-department reviews with a dedicated table:
```sql
CREATE TABLE mrf_det_reviews:
- id (PK)
- mrf_det_id (FK to mrf_det.id)
- reviewerId 
- department
- reviewStatus ENUM('pending_review', 'approved', 'rejected', 'needs_info')
- reviewNote TEXT
- reviewPriority ENUM('low', 'normal', 'high', 'urgent')
- reviewDecision
- reviewComment 
- sentForReviewAt, reviewedAt
- sentForReviewBy
```

### ✅ **3. Create Summary View**
For easy querying:
```sql
CREATE VIEW vw_mrf_det_with_reviews AS
- All mrf_det fields
- Review summary counts (total_reviews, pending_reviews, etc.)
- Overall review status
- Reviewing departments list
- Highest pending priority
```

## Why This Approach Works Best

### **Handles Multiple Department Reviews**
```
Example: Part ABC123 needs review by:
├── Quality Department (Reviewer: John)
├── Engineering Department (Reviewer: Sarah)  
└── Safety Department (Reviewer: Mike)

mrf_det_reviews table:
| id | mrf_det_id | reviewerId | department   | reviewStatus     |
|----|------------|------------|--------------|------------------|
| 1  | 123        | john_id    | Quality      | approved         |
| 2  | 123        | sarah_id   | Engineering  | pending_review   |
| 3  | 123        | mike_id    | Safety       | rejected         |
```

### **Flexible Workflow Support**
- **Single Department**: Just one review record
- **Multiple Departments**: Multiple review records per item
- **Sequential Reviews**: Add new reviewers after initial feedback
- **Parallel Reviews**: All departments review simultaneously

### **Clear Status Tracking**
- **Item Level**: Overall validation status in `mrf_det`
- **Department Level**: Individual review status in `mrf_det_reviews`
- **Summary Level**: Aggregated view in `vw_mrf_det_with_reviews`

## Benefits Over Single Table Approach

### ❌ **Single Table Problems**
If we only used `mrf_det` with review fields:
```sql
-- This ONLY works for ONE reviewer per item
ALTER TABLE mrf_det ADD reviewerId, reviewStatus, reviewNote...
```
**Issues:**
- Can't handle multiple department reviews
- No history of different department decisions
- Can't track who approved vs who rejected
- No parallel review workflow

### ✅ **Hybrid Solution Benefits**
1. **Scalability**: Support 1 to N reviewers per item
2. **Audit Trail**: Complete history of all reviews
3. **Flexibility**: Different workflows per organization
4. **Performance**: Optimized queries with summary view
5. **Data Integrity**: Foreign key relationships

## Real-World Workflow Examples

### **Example 1: Standard Single Review**
```
Part XYZ456 → Quality Department → Approved
(Only 1 record in mrf_det_reviews)
```

### **Example 2: Multi-Department Critical Part**
```
Part ABC123 → Quality (Approved) + Engineering (Pending) + Safety (Needs Info)
(3 records in mrf_det_reviews, overall status = "needs_information")
```

### **Example 3: Escalation Workflow**
```
Part DEF789 → Initial Reviewer (Rejected) → Senior Reviewer (Approved)
(2 records in mrf_det_reviews showing escalation history)
```

## Query Examples

### **Get Item with All Reviews**
```sql
SELECT md.*, r.department, r.reviewStatus, r.reviewComment, u.firstName
FROM mrf_det md
LEFT JOIN mrf_det_reviews r ON md.id = r.mrf_det_id
LEFT JOIN users u ON r.reviewerId = u.id
WHERE md.id = 123;
```

### **Get Items Needing Department Approval**
```sql
SELECT * FROM vw_mrf_det_with_reviews 
WHERE overall_review_status = 'pending_reviews'
AND reviewing_departments LIKE '%Engineering%';
```

### **Dashboard for Reviewer**
```sql
SELECT md.partNumber, r.reviewPriority, r.sentForReviewAt
FROM mrf_det_reviews r
JOIN mrf_det md ON r.mrf_det_id = md.id
WHERE r.reviewerId = 'john_id' AND r.reviewStatus = 'pending_review'
ORDER BY r.reviewPriority DESC, r.sentForReviewAt ASC;
```

## Implementation Summary

✅ **Database**: Hybrid approach with existing table + review table  
✅ **API**: Updated to handle multi-department assignments  
✅ **Frontend**: Enhanced UI for department selection and review tracking  
✅ **Services**: Specialized services for multi-department workflows  

This architecture provides enterprise-level flexibility while maintaining data integrity and performance!
