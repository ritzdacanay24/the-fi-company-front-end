import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { BaseRepository } from '@/shared/repositories';

@Injectable()
export class GraphicsProductionRepository extends BaseRepository<RowDataPacket> {
  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('graphicsSchedule', mysqlService);
  }

  async getQueues(): Promise<RowDataPacket[]> {
    const sql = `
      SELECT a.id
        , a.name
        , a.path
        , a.queueStatus
        , a.seq
        , 'false' AS disabled
      FROM eyefidb.graphicsQueues a
      WHERE a.queueStatus != 999
        AND a.active = 1
      ORDER BY a.seq ASC
    `;
    return this.rawQuery<RowDataPacket>(sql);
  }

  async getOpenOrders(): Promise<RowDataPacket[]> {
    const sql = `
      SELECT a.id
        , a.orderNum
        , a.itemNumber
        , a.customer
        , a.qty
        , a.dueDate
        , now() AS now
        , REPLACE(a.customerPartNumber, '\n', '') AS customerPartNumber
        , a.purchaseOrder
        , a.userId
        , a.createdDate
        , a.status
        , a.priority
        , a.active
        , DATEDIFF(a.dueDate, DATE(NOW())) AS age
        , holds.hits AS holdCount
        , packingSlipNumber
        , a.material
        , CASE WHEN a.materialSize = '' THEN 'None' ELSE a.materialSize END AS materialSize
        , a.materialLocation
        , partials
        , a.qty - a.qtyShipped AS openQty
        , a.qtyShipped
        , a.instructions
        , CONCAT(b.first, ' ', b.last) AS userName
        , c.name AS queueStatus
        , CASE
            WHEN DATEDIFF(a.dueDate, DATE(NOW())) < 0 THEN 'pastDue'
            WHEN DATEDIFF(a.dueDate, DATE(NOW())) = 0 THEN 'dueToday'
            WHEN DATEDIFF(a.dueDate, DATE(NOW())) > 0 THEN 'future'
            ELSE 'black'
          END AS colorClass
        , CASE
            WHEN DATE(a.dueDate) = DATE(NOW())
              THEN TIMESTAMPDIFF(SECOND, NOW(), a.createdDate) + a.priority + -999999999
            WHEN DATE(a.dueDate) < DATE(NOW())
              THEN TIMESTAMPDIFF(SECOND, NOW(), a.createdDate)
            WHEN DATE(a.dueDate) > DATE(NOW())
              THEN TIMESTAMPDIFF(SECOND, a.createdDate, NOW()) + a.priority + 999999999
          END AS customOrderBy
        , CASE
            WHEN a.status = 900 AND a.qty - a.qtyShipped != 0 THEN 'Pending Ship'
            WHEN a.qty - a.qtyShipped = 0 THEN 'Shipped Complete'
            WHEN a.qty - a.qtyShipped != a.qty THEN 'Shipped Partials'
            ELSE ''
          END AS shipStatus
        , issues.hits AS issueCount
        , a.plexRequired
        , a.plexOrdered
        , a.graphicsWorkOrder
        , CONCAT('WO', '', a.graphicsWorkOrder) AS graphicsWorkOrder1
        , a.prototypeCheck
        , CASE WHEN a.qty - a.qtyShipped = 0 THEN 1 ELSE 0 END AS shipComplete
        , a.shippedOn
        , DATE(a.shippedOn) AS shippedOnDate
        , TIMESTAMPDIFF(MINUTE, a.createdDate, a.shippedOn) AS shipProcessingTime
        , a.allocQty
        , CASE
            WHEN a.criticalOrder = 1 THEN 'orangered'
            WHEN issues.hits > 0 THEN 'bg-dark'
            WHEN holds.hits > 0 THEN 'bg-info'
            WHEN a.allocQty THEN 'bg-warning'
            WHEN a.priority = 10 THEN 'pastDue'
            WHEN a.dueDate < CURDATE() THEN 'pastDue'
            WHEN a.dueDate = CURDATE() THEN 'dueToday'
            WHEN a.dueDate > CURDATE() THEN 'future'
          END AS classColors
        , CASE
            WHEN issues.hits > 0 THEN 'Damage/Reject found'
            WHEN holds.hits > 0 THEN 'Hold found'
            WHEN a.priority = 10 THEN 'Hot order'
            WHEN DATEDIFF(a.dueDate, DATE(NOW())) < 0 THEN 'Past due order'
            WHEN DATEDIFF(a.dueDate, DATE(NOW())) = 0 THEN 'Due today order'
            WHEN DATEDIFF(a.dueDate, DATE(NOW())) > 0 THEN 'Future order'
            ELSE 'Default'
          END AS title
        , a.criticalOrder
        , a.description
        , comments.hits AS commentCount
        , a.ordered_date
      FROM eyefidb.graphicsSchedule a
      LEFT JOIN (
        SELECT COUNT(*) AS hits, orderNum
        FROM eyefidb.holds
        WHERE active = 1
        GROUP BY orderNum
      ) holds ON a.orderNum = holds.orderNum
      LEFT JOIN db.users b ON b.id = a.userId
      LEFT JOIN eyefidb.graphicsQueues c ON c.queueStatus = a.status AND c.active = 1
      LEFT JOIN (
        SELECT COUNT(*) AS hits, so
        FROM eyefidb.graphicsIssues
        WHERE active = 1
        GROUP BY so
      ) issues ON a.orderNum = issues.so
      LEFT JOIN (
        SELECT COUNT(*) AS hits, orderNum
        FROM eyefidb.comments
        WHERE active = 1 AND type = 'Graphics'
        GROUP BY orderNum
      ) comments ON a.graphicsWorkOrder = comments.orderNum
      WHERE a.active = 1
        AND a.qty - a.qtyShipped != 0
      ORDER BY a.criticalOrder DESC, a.priority ASC, a.dueDate ASC
    `;
    return this.rawQuery<RowDataPacket>(sql);
  }
}
