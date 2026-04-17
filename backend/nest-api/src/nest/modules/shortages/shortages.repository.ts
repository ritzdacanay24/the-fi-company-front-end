import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { BaseRepository } from '@/shared/repositories';

interface ShortageRow extends RowDataPacket {
  id: number;
}

interface MiscRow extends RowDataPacket {
  so: number;
}

interface CommentRow extends RowDataPacket {
  orderNum: number;
}

@Injectable()
export class ShortagesRepository extends BaseRepository<RowDataPacket> {
  private static readonly ALLOWED_COLUMNS = [
    'id',
    'jobNumber',
    'woNumber',
    'lineNumber',
    'dueDate',
    'reasonPartNeeded',
    'priority',
    'partNumber',
    'qty',
    'createdBy',
    'createdDate',
    'active',
    'status',
    'deleted_main_date',
    'deleted_main_user',
    'active_line',
    'comments',
    'partDesc',
    'buyer',
    'assemblyNumber',
    'supplyCompleted',
    'receivingCompleted',
    'deliveredCompleted',
    'supplyCompletedBy',
    'receivingCompletedBy',
    'deliveredCompletedBy',
    'productionIssuedDate',
    'productionIssuedBy',
    'graphicsShortage',
    'poNumber',
    'supplier',
    'mrfId',
    'mrf_line',
  ] as const;

  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('shortageRequest', mysqlService);
  }

  async getList(params: { active?: number; queue?: string }): Promise<RowDataPacket[]> {
    const queryParams: unknown[] = [];

    let sql = `
      SELECT a.*, CONCAT(b.first, ' ', b.last) AS createdBy
      FROM shortageRequest a
      LEFT JOIN db.users b ON b.id = a.createdBy
      WHERE 1 = 1
    `;

    if (params.active === 1 || params.active === 0) {
      sql += ' AND a.active = ?';
      queryParams.push(params.active);
    }

    if (params.queue === 'Supply Open') {
      sql += ' AND a.supplyCompleted IS NULL';
    } else if (params.queue === 'Delivered Open') {
      sql += ' AND (a.supplyCompleted IS NOT NULL AND a.deliveredCompleted IS NULL)';
    } else if (params.queue === 'Receiving Open') {
      sql += ' AND (a.deliveredCompleted IS NOT NULL AND a.receivingCompleted IS NULL)';
    } else if (params.queue === 'Production Open') {
      sql += ' AND a.receivingCompleted IS NOT NULL AND a.productionIssuedDate IS NULL';
    } else {
      sql += ' AND (a.supplyCompleted IS NULL OR a.deliveredCompleted IS NULL OR a.receivingCompleted IS NULL OR a.productionIssuedDate IS NULL)';
    }

    sql += ' ORDER BY a.createdDate DESC';

    const rows = await this.rawQuery<ShortageRow>(sql, queryParams);
    if (rows.length === 0) {
      return [];
    }

    const ids = rows.map((row) => row.id).filter(Boolean);
    const placeholders = ids.map(() => '?').join(',');

    const miscRows = await this.rawQuery<MiscRow>(
      `SELECT * FROM eyefidb.workOrderOwner WHERE so IN (${placeholders})`,
      ids,
    );

    const commentRows = await this.rawQuery<CommentRow>(
      `
      SELECT a.orderNum,
        a.comments_html,
        a.comments,
        a.createdDate,
        CASE WHEN DATE(a.createdDate) = CURDATE() THEN 'text-success' ELSE 'text-info' END AS color_class_name,
        CASE WHEN DATE(a.createdDate) = CURDATE() THEN 'bg-success' ELSE 'bg-info' END AS bg_class_name,
        CONCAT('SO#: ', a.orderNum) AS comment_title,
        CONCAT(c.first, ' ', c.last) AS created_by_name
      FROM eyefidb.comments a
      INNER JOIN (
        SELECT orderNum, MAX(id) id
        FROM eyefidb.comments
        GROUP BY orderNum
      ) b ON a.orderNum = b.orderNum AND a.id = b.id
      LEFT JOIN db.users c ON c.id = a.userId
      WHERE a.type = 'Shortage Request'
        AND a.orderNum IN (${placeholders})
        AND a.active = 1
      `,
      ids,
    );

    const miscBySo = new Map<number, MiscRow>();
    for (const row of miscRows) {
      miscBySo.set(Number(row.so), row);
    }

    const commentsByOrder = new Map<number, CommentRow>();
    for (const row of commentRows) {
      commentsByOrder.set(Number(row.orderNum), row);
    }

    return rows.map((row) => ({
      ...row,
      misc: miscBySo.get(Number(row.id)) || {},
      recent_comments: commentsByOrder.get(Number(row.id)) || {},
    }));
  }

  async find(filters: Record<string, unknown>): Promise<RowDataPacket[]> {
    const safeFilters = Object.fromEntries(
      Object.entries(filters).filter(([key]) =>
        (ShortagesRepository.ALLOWED_COLUMNS as readonly string[]).includes(key),
      ),
    );
    return super.find(safeFilters);
  }

  async getAll(selectedViewType?: string): Promise<RowDataPacket[]> {
    if (selectedViewType === 'Active') {
      return super.find({ active: 1 });
    }
    if (selectedViewType === 'Inactive') {
      const sql = 'SELECT * FROM shortageRequest WHERE active = 0 OR active IS NULL';
      return this.rawQuery<RowDataPacket>(sql);
    }
    return super.find();
  }

  async getById(id: number): Promise<RowDataPacket | null> {
    return super.findOne({ id });
  }

  async create(payload: Record<string, unknown>): Promise<number> {
    return super.create(this.getSafePayload(payload));
  }

  async createShortages(data: Array<Record<string, unknown>>): Promise<number> {
    const jobNumber = String(Date.now());
    let insertCount = 0;

    for (const row of data) {
      const payload = this.getSafePayload({
        ...row,
        jobNumber,
      });

      if (Object.keys(payload).length === 0) {
        continue;
      }

      await super.create(payload);
      insertCount += 1;
    }

    return insertCount;
  }

  async updateById(id: number, payload: Record<string, unknown>): Promise<number> {
    const safePayload = this.getSafePayload(payload);
    if (Object.keys(safePayload).length === 0) {
      return 0;
    }
    return super.updateById(id, safePayload);
  }

  async deleteById(id: number): Promise<number> {
    return super.deleteById(id);
  }

  private getSafePayload(payload: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(payload).filter(
        ([key]) =>
          (ShortagesRepository.ALLOWED_COLUMNS as readonly string[]).includes(key) && key !== 'id',
      ),
    );
  }
}
