# Job Connections Implementation - Option 1: Using Existing group_id

## Database Schema (Recommended)
Use the existing `group_id` field in the `fs_scheduler` table to group related jobs together.

### Advantages:
- ✅ Uses existing field and APIs
- ✅ Simple implementation
- ✅ Already has supporting APIs (`getConnectingJobs`, `getGroupJobs`)
- ✅ No database changes required

### Implementation:
1. When connecting jobs, assign them the same `group_id`
2. Use existing API endpoints:
   - `getConnectingJobs(group_id)` - to fetch related jobs
   - `getGroupJobs(group_id)` - to get all jobs in group

### Workflow:
```javascript
// When connecting jobs:
// 1. Generate a unique group_id (or use existing if job already has one)
const groupId = this.form.get('job.group_id')?.value || this.generateUniqueGroupId();

// 2. Update current job with group_id
this.form.get('job.group_id')?.setValue(groupId);

// 3. For each selected job to connect:
selectedJobs.forEach(jobId => {
  this.schedulerService.updateById(jobId, { group_id: groupId });
});
```

### Relationship Types:
Store relationship types in the existing `connecting_jobs` field as JSON:
```json
{
  "relationships": [
    {"job_id": "123", "type": "Dependent"},
    {"job_id": "124", "type": "Prerequisite"}
  ]
}
```
