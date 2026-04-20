import { Inject, Injectable } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';

export interface JobConnectionRecord extends RowDataPacket {
  id: number;
  parent_job_id: number;
  connected_job_id: number;
  relationship_type: string | null;
  notes: string | null;
  created_by: string | null;
  created_date: string | null;
  active: number;
}

@Injectable()
export class JobConnectionRepository {
  constructor(@Inject(MysqlService) private readonly mysqlService: MysqlService) {}

  async getJobConnections(jobId: number): Promise<RowDataPacket[]> {
    return this.mysqlService.query<RowDataPacket[]>(
      `SELECT
         c.id AS connection_id,
         c.relationship_type,
         c.notes,
         c.created_date,
         c.created_by,
         CASE
           WHEN c.parent_job_id = ? THEN c.connected_job_id
           ELSE c.parent_job_id
         END AS connected_job_id,
         CASE
           WHEN c.parent_job_id = ? THEN s2.id
           ELSE s1.id
         END AS fs_id,
         CASE
           WHEN c.parent_job_id = ? THEN s2.customer
           ELSE s1.customer
         END AS customer,
         CASE
           WHEN c.parent_job_id = ? THEN s2.service_type
           ELSE s1.service_type
         END AS service_type,
         CASE
           WHEN c.parent_job_id = ? THEN s2.status
           ELSE s1.status
         END AS status,
         CASE
           WHEN c.parent_job_id = ? THEN s2.request_date
           ELSE s1.request_date
         END AS request_date
       FROM eyefidb.fs_job_connections c
       JOIN eyefidb.fs_scheduler s1 ON s1.id = c.parent_job_id
       JOIN eyefidb.fs_scheduler s2 ON s2.id = c.connected_job_id
       WHERE (c.parent_job_id = ? OR c.connected_job_id = ?)
         AND c.active = 1
       ORDER BY c.created_date DESC`,
      [jobId, jobId, jobId, jobId, jobId, jobId, jobId, jobId],
    );
  }

  async checkConnectionExists(parentJobId: number, connectedJobId: number, relationshipType: string): Promise<boolean> {
    const rows = await this.mysqlService.query<RowDataPacket[]>(
      `SELECT id
       FROM eyefidb.fs_job_connections
       WHERE ((parent_job_id = ? AND connected_job_id = ?)
           OR (parent_job_id = ? AND connected_job_id = ?))
         AND relationship_type = ?
         AND active = 1`,
      [parentJobId, connectedJobId, connectedJobId, parentJobId, relationshipType],
    );

    return rows.length > 0;
  }

  async createConnection(payload: {
    parent_job_id: number;
    connected_job_id: number;
    relationship_type: string;
    notes: string;
    created_by: string;
  }): Promise<number> {
    const result = await this.mysqlService.execute<ResultSetHeader>(
      `INSERT INTO eyefidb.fs_job_connections
         (parent_job_id, connected_job_id, relationship_type, notes, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [
        payload.parent_job_id,
        payload.connected_job_id,
        payload.relationship_type,
        payload.notes,
        payload.created_by,
      ],
    );

    return result.insertId;
  }

  async deleteConnection(id: number): Promise<number> {
    const result = await this.mysqlService.execute<ResultSetHeader>(
      `DELETE FROM eyefidb.fs_job_connections WHERE id = ?`,
      [id],
    );

    return result.affectedRows;
  }

  async updateConnection(id: number, payload: { relationship_type?: string; notes?: string }): Promise<number> {
    const setClauses: string[] = [];
    const params: unknown[] = [];

    if (payload.relationship_type !== undefined) {
      setClauses.push('relationship_type = ?');
      params.push(payload.relationship_type);
    }

    if (payload.notes !== undefined) {
      setClauses.push('notes = ?');
      params.push(payload.notes);
    }

    if (setClauses.length === 0) {
      return 0;
    }

    params.push(id);

    const result = await this.mysqlService.execute<ResultSetHeader>(
      `UPDATE eyefidb.fs_job_connections
       SET ${setClauses.join(', ')}
       WHERE id = ? AND active = 1`,
      params,
    );

    return result.affectedRows;
  }

  async getConnectionStats(jobId: number): Promise<RowDataPacket> {
    const statsRows = await this.mysqlService.query<RowDataPacket[]>(
      `SELECT
         COUNT(*) AS total_connections,
         COUNT(CASE WHEN parent_job_id = ? THEN 1 END) AS outgoing_connections,
         COUNT(CASE WHEN connected_job_id = ? THEN 1 END) AS incoming_connections,
         GROUP_CONCAT(DISTINCT relationship_type) AS relationship_types
       FROM eyefidb.fs_job_connections
       WHERE (parent_job_id = ? OR connected_job_id = ?)
         AND active = 1`,
      [jobId, jobId, jobId, jobId],
    );

    const breakdown = await this.mysqlService.query<RowDataPacket[]>(
      `SELECT relationship_type, COUNT(*) AS count
       FROM eyefidb.fs_job_connections
       WHERE (parent_job_id = ? OR connected_job_id = ?)
         AND active = 1
       GROUP BY relationship_type`,
      [jobId, jobId],
    );

    const stats = statsRows[0] ?? {
      total_connections: 0,
      outgoing_connections: 0,
      incoming_connections: 0,
      relationship_types: null,
    };

    return {
      job_id: jobId,
      total_connections: Number(stats.total_connections ?? 0),
      outgoing_connections: Number(stats.outgoing_connections ?? 0),
      incoming_connections: Number(stats.incoming_connections ?? 0),
      relationship_types: stats.relationship_types
        ? String(stats.relationship_types).split(',')
        : [],
      relationship_breakdown: breakdown,
    } as RowDataPacket;
  }

  async getJobsWithConnections(): Promise<RowDataPacket[]> {
    return this.mysqlService.query<RowDataPacket[]>(
      `SELECT
         s.id,
         s.customer,
         s.service_type,
         s.status,
         s.request_date,
         COUNT(c.id) AS connection_count
       FROM eyefidb.fs_scheduler s
       JOIN eyefidb.fs_job_connections c
         ON (c.parent_job_id = s.id OR c.connected_job_id = s.id)
       WHERE c.active = 1
       GROUP BY s.id, s.customer, s.service_type, s.status, s.request_date
       ORDER BY connection_count DESC, s.id DESC`,
    );
  }

  async searchConnectableJobs(currentJobId: number, searchTerm: string): Promise<RowDataPacket[]> {
    return this.mysqlService.query<RowDataPacket[]>(
      `SELECT
         s.id,
         s.customer,
         s.service_type,
         s.status,
         s.request_date
       FROM eyefidb.fs_scheduler s
       WHERE s.id != ?
         AND (
           CAST(s.id AS CHAR) LIKE ?
           OR COALESCE(s.customer, '') LIKE ?
           OR COALESCE(s.service_type, '') LIKE ?
           OR COALESCE(s.status, '') LIKE ?
         )
         AND s.id NOT IN (
           SELECT CASE
             WHEN c.parent_job_id = ? THEN c.connected_job_id
             ELSE c.parent_job_id
           END
           FROM eyefidb.fs_job_connections c
           WHERE (c.parent_job_id = ? OR c.connected_job_id = ?)
             AND c.active = 1
         )
       ORDER BY s.id DESC
       LIMIT 50`,
      [
        currentJobId,
        `%${searchTerm}%`,
        `%${searchTerm}%`,
        `%${searchTerm}%`,
        `%${searchTerm}%`,
        currentJobId,
        currentJobId,
        currentJobId,
      ],
    );
  }
}
