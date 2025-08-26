# Job Connections Implementation - Option 2: Using connecting_jobs Field

## Database Schema
Use the existing `connecting_jobs` field in the `fs_scheduler` table to store connection data as JSON.

### Advantages:
- ✅ Uses existing field
- ✅ No database schema changes
- ✅ Stores detailed relationship information
- ✅ Flexible data structure

### Implementation:
Store connection data as JSON in the `connecting_jobs` field:

```json
{
  "connected_jobs": [
    {
      "job_id": "123",
      "relationship_type": "Dependent",
      "created_date": "2025-07-14",
      "notes": "Must complete before this job"
    },
    {
      "job_id": "124", 
      "relationship_type": "Prerequisite",
      "created_date": "2025-07-14",
      "notes": "Required for this job"
    }
  ]
}
```

### TypeScript Implementation:
```typescript
// Save connections
saveJobConnections() {
  const connections = this.selectedJobs.map(jobId => ({
    job_id: jobId,
    relationship_type: this.selectedRelationshipType,
    created_date: new Date().toISOString().split('T')[0],
    notes: ''
  }));

  const connectionData = {
    connected_jobs: connections
  };

  this.form.get('job.connecting_jobs')?.setValue(JSON.stringify(connectionData));
}

// Load connections
loadJobConnections() {
  const connectingJobs = this.form.get('job.connecting_jobs')?.value;
  if (connectingJobs) {
    const data = JSON.parse(connectingJobs);
    this.connectedJobs = data.connected_jobs || [];
  }
}
```

### Querying Connected Jobs:
```sql
-- Find all jobs connected to a specific job
SELECT * FROM fs_scheduler 
WHERE JSON_EXTRACT(connecting_jobs, '$.connected_jobs[*].job_id') LIKE '%123%';

-- Or use application logic to parse JSON
```
