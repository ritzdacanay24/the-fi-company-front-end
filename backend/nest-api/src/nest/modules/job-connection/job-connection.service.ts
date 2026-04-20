import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { JobConnectionRepository } from './job-connection.repository';

@Injectable()
export class JobConnectionService {
  constructor(private readonly repository: JobConnectionRepository) {}

  async getJobConnections(jobId: number) {
    if (!jobId) {
      throw new BadRequestException('job_id parameter is required');
    }
    return this.repository.getJobConnections(jobId);
  }

  async createJobConnection(payload: {
    parent_job_id?: number;
    connected_job_id?: number;
    relationship_type?: string;
    notes?: string;
    created_by?: string;
  }) {
    const parentJobId = Number(payload.parent_job_id);
    const connectedJobId = Number(payload.connected_job_id);
    const relationshipType = payload.relationship_type ?? 'Related';

    if (!parentJobId || !connectedJobId) {
      throw new BadRequestException('parent_job_id and connected_job_id are required');
    }

    if (parentJobId === connectedJobId) {
      throw new BadRequestException('Cannot connect a job to itself');
    }

    const exists = await this.repository.checkConnectionExists(parentJobId, connectedJobId, relationshipType);
    if (exists) {
      throw new BadRequestException('Connection already exists');
    }

    const connectionId = await this.repository.createConnection({
      parent_job_id: parentJobId,
      connected_job_id: connectedJobId,
      relationship_type: relationshipType,
      notes: payload.notes ?? '',
      created_by: payload.created_by ?? 'system',
    });

    return {
      success: true,
      connection_id: connectionId,
      message: 'Job connection created successfully',
    };
  }

  async deleteJobConnection(id: number) {
    if (!id) {
      throw new BadRequestException('connection id parameter is required');
    }

    const affectedRows = await this.repository.deleteConnection(id);
    if (affectedRows === 0) {
      throw new NotFoundException('Connection not found');
    }

    return {
      success: true,
      message: 'Job connection deleted successfully',
    };
  }

  async updateJobConnection(id: number, payload: { relationship_type?: string; notes?: string }) {
    if (!id) {
      throw new BadRequestException('Connection id parameter is required');
    }

    if (payload.relationship_type === undefined && payload.notes === undefined) {
      throw new BadRequestException('No valid fields to update');
    }

    const affectedRows = await this.repository.updateConnection(id, payload);
    if (affectedRows === 0) {
      throw new NotFoundException('Connection not found or no changes made');
    }

    return {
      success: true,
      message: 'Job connection updated successfully',
    };
  }

  async getConnectionStats(jobId: number) {
    if (!jobId) {
      throw new BadRequestException('job_id parameter is required');
    }
    return this.repository.getConnectionStats(jobId);
  }

  async getJobsWithConnections() {
    return this.repository.getJobsWithConnections();
  }

  async searchConnectableJobs(currentJobId: number, searchTerm = '') {
    if (!currentJobId) {
      throw new BadRequestException('current_job_id parameter is required');
    }
    return this.repository.searchConnectableJobs(currentJobId, searchTerm);
  }
}
