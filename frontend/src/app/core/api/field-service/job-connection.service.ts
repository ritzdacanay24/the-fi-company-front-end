import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class JobConnectionService {
  private readonly baseUrl = 'FieldServiceMobile/job-connection';

  constructor(private http: HttpClient) {}

  /**
   * Get all job connections for a specific job
   * @param jobId - The ID of the job to get connections for
   * @returns Promise with array of job connections
   */
  getJobConnections(jobId: string | number) {
    return firstValueFrom(
      this.http.get(`${this.baseUrl}/getJobConnections.php?job_id=${jobId}`)
    );
  }

  /**
   * Create a new job connection
   * @param connectionData - The connection data to create
   * @returns Promise with the created connection result
   */
  createJobConnection(connectionData: {
    parent_job_id: string | number;
    connected_job_id: string | number;
    relationship_type?: string;
    notes?: string;
    created_by?: string;
  }) {
    return firstValueFrom(
      this.http.post(`${this.baseUrl}/createJobConnection.php`, connectionData)
    );
  }

  /**
   * Create multiple job connections at once
   * @param connections - Array of connection data
   * @returns Promise with results of all connection creations
   */
  async createMultipleConnections(connections: Array<{
    parent_job_id: string | number;
    connected_job_id: string | number;
    relationship_type?: string;
    notes?: string;
    created_by?: string;
  }>) {
    const promises = connections.map(connection => this.createJobConnection(connection));
    return Promise.all(promises);
  }

  /**
   * Delete a job connection (soft delete)
   * @param connectionId - The ID of the connection to delete
   * @returns Promise with deletion result
   */
  deleteJobConnection(connectionId: number) {
    return firstValueFrom(
      this.http.delete(`${this.baseUrl}/deleteJobConnection.php?id=${connectionId}`)
    );
  }

  /**
   * Delete multiple job connections at once
   * @param connectionIds - Array of connection IDs to delete
   * @returns Promise with results of all deletions
   */
  async deleteMultipleConnections(connectionIds: number[]) {
    const promises = connectionIds.map(id => this.deleteJobConnection(id));
    return Promise.all(promises);
  }

  /**
   * Update a job connection's relationship type or notes
   * @param connectionId - The ID of the connection to update
   * @param updateData - The data to update
   * @returns Promise with update result
   */
  updateJobConnection(connectionId: number, updateData: {
    relationship_type?: string;
    notes?: string;
  }) {
    return firstValueFrom(
      this.http.put(`${this.baseUrl}/updateJobConnection.php?id=${connectionId}`, updateData)
    );
  }

  /**
   * Get connection statistics for a job
   * @param jobId - The ID of the job
   * @returns Promise with connection statistics
   */
  getConnectionStats(jobId: string | number) {
    return firstValueFrom(
      this.http.get(`${this.baseUrl}/getConnectionStats.php?job_id=${jobId}`)
    );
  }

  /**
   * Get all jobs that are connected to any other jobs (for reports/analytics)
   * @returns Promise with array of jobs that have connections
   */
  getJobsWithConnections() {
    return firstValueFrom(
      this.http.get(`${this.baseUrl}/getJobsWithConnections.php`)
    );
  }

  /**
   * Search for potential jobs to connect (excluding already connected ones)
   * @param currentJobId - The current job ID
   * @param searchTerm - Search term for job search
   * @returns Promise with filtered job results
   */
  searchConnectableJobs(currentJobId: string | number, searchTerm: string = '') {
    const params = new URLSearchParams({
      current_job_id: currentJobId.toString(),
      search: searchTerm
    });
    
    return firstValueFrom(
      this.http.get(`${this.baseUrl}/searchConnectableJobs.php?${params}`)
    );
  }
}
