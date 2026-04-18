import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { BaseRepository } from '@/shared/repositories';

@Injectable()
export class GraphicsScheduleRepository extends BaseRepository<RowDataPacket> {
  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('graphicsSchedule', mysqlService);
  }

  async getById(id: number): Promise<RowDataPacket | null> {
    const sql = `
      SELECT a.id
        , a.dueDate
        , a.orderNum
        , a.itemNumber
        , a.description
        , a.customer
        , a.qty
        , a.qty - a.qtyShipped AS openQty
        , a.qtyShipped
        , a.customerPartNumber
        , a.purchaseOrder
        , a.status
        , a.priority
        , a.partials
        , a.protoTypeCheck
        , a.graphicsWorkOrder
        , a.userId
        , a.active
        , CASE WHEN a.qty - a.qtyShipped = 0 THEN 1 ELSE 0 END AS shipComplete
        , a.instructions
        , a.plexRequired
        , CASE
            WHEN a.status = 900 AND a.qty - a.qtyShipped != 0
              THEN 'Pending Ship'
            ELSE b.name
          END AS statusText
        , a.shippedOn
        , a.createdDate
        , CONCAT(c.first, ' ', c.last) AS createdBy
        , CASE
            WHEN a.qty - a.qtyShipped > 0 AND a.status != 999
              THEN DATEDIFF(a.dueDate, DATE(NOW()))
          END AS age
      FROM eyefidb.graphicsSchedule a
      LEFT JOIN eyefidb.graphicsQueues b ON a.status = b.queueStatus
      LEFT JOIN db.users c ON c.id = a.userId
      WHERE a.id = ?
    `;
    const rows = await this.rawQuery<RowDataPacket>(sql, [id]);
    return rows[0] ?? null;
  }

  async getList(): Promise<RowDataPacket[]> {
    const sql = `
      SELECT a.id
        , a.dueDate
        , a.orderNum
        , a.itemNumber
        , a.description
        , a.customer
        , a.qty
        , a.qty - a.qtyShipped AS openQty
        , a.qtyShipped
        , a.customerPartNumber
        , a.purchaseOrder
        , a.status
        , a.priority
        , a.partials
        , a.protoTypeCheck
        , a.graphicsWorkOrder
        , a.userId
        , a.active
        , CASE WHEN a.qty - a.qtyShipped = 0 THEN 1 ELSE 0 END AS shipComplete
        , a.instructions
        , a.plexRequired
        , CASE
            WHEN a.status = 900 AND a.qty - a.qtyShipped != 0
              THEN 'Pending Ship'
            ELSE b.name
          END AS statusText
        , a.shippedOn
        , a.createdDate
        , CONCAT(c.first, ' ', c.last) AS createdBy
        , CASE
            WHEN a.qty - a.qtyShipped > 0 AND a.status != 999
              THEN DATEDIFF(a.dueDate, DATE(NOW()))
          END AS age
      FROM eyefidb.graphicsSchedule a
      LEFT JOIN eyefidb.graphicsQueues b ON a.status = b.queueStatus
      LEFT JOIN db.users c ON c.id = a.userId
      ORDER BY a.createdDate DESC
    `;
    return this.rawQuery<RowDataPacket>(sql);
  }
}
