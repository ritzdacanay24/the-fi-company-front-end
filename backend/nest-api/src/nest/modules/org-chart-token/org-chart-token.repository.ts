import { Inject, Injectable } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';

export type OrgChartTokenRow = RowDataPacket & {
  id: number;
  token: string;
  password_hash: string | null;
  expires_at: string;
  generated_by: number | null;
  access_count: number;
  last_accessed_at: string | null;
  is_revoked: number;
  revoked_at: string | null;
  created_at: string;
};

@Injectable()
export class OrgChartTokenRepository {
  constructor(@Inject(MysqlService) private readonly mysqlService: MysqlService) {}

  async createToken(payload: {
    token: string;
    passwordHash: string | null;
    expiresAt: string;
    generatedBy: number | null;
  }): Promise<number> {
    const result = await this.mysqlService.execute<ResultSetHeader>(
      `INSERT INTO org_chart_tokens (
        token, password_hash, expires_at, generated_by, created_at
      ) VALUES (?, ?, ?, ?, NOW())`,
      [payload.token, payload.passwordHash, payload.expiresAt, payload.generatedBy],
    );

    return result.insertId;
  }

  async getActiveTokenByValue(token: string): Promise<OrgChartTokenRow | null> {
    const rows = await this.mysqlService.query<OrgChartTokenRow[]>(
      `SELECT *
       FROM org_chart_tokens
       WHERE token = ?
         AND is_revoked = 0
       LIMIT 1`,
      [token],
    );

    return rows[0] || null;
  }

  async incrementAccessCount(id: number): Promise<void> {
    await this.mysqlService.execute<ResultSetHeader>(
      `UPDATE org_chart_tokens
       SET access_count = access_count + 1,
           last_accessed_at = NOW()
       WHERE id = ?`,
      [id],
    );
  }

  async revokeToken(id: number): Promise<number> {
    const result = await this.mysqlService.execute<ResultSetHeader>(
      `UPDATE org_chart_tokens
       SET is_revoked = 1,
           revoked_at = NOW()
       WHERE id = ?`,
      [id],
    );

    return result.affectedRows;
  }

  async listActiveTokens(): Promise<RowDataPacket[]> {
    return this.mysqlService.query<RowDataPacket[]>(
      `SELECT
          id,
          LEFT(token, 10) AS token_preview,
          expires_at,
          access_count,
          last_accessed_at,
          generated_by,
          created_at,
          CASE WHEN password_hash IS NOT NULL THEN 1 ELSE 0 END AS has_password
       FROM org_chart_tokens
       WHERE is_revoked = 0
         AND expires_at > NOW()
       ORDER BY created_at DESC`,
    );
  }
}
