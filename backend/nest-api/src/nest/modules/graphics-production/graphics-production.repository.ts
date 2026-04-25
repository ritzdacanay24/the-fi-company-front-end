import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { BaseRepository } from '@/shared/repositories';

@Injectable()
export class GraphicsProductionRepository extends BaseRepository<RowDataPacket> {
  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('graphicsSchedule', mysqlService);
  }

  async getDueTodayOpenOrders(): Promise<RowDataPacket[]> {
    const sql = `
      SELECT a.id
        , a.orderNum
        , a.itemNumber
        , a.customer
        , a.qty
        , a.qtyShipped
        , a.qty - a.qtyShipped AS openQty
        , a.dueDate
        , a.priority
        , a.status
        , a.graphicsWorkOrder
        , a.createdDate
        , c.name AS queueStatus
      FROM eyefidb.graphicsSchedule a
      LEFT JOIN eyefidb.graphicsQueues c ON c.queueStatus = a.status AND c.active = 1
      WHERE a.active = 1
        AND a.qty - a.qtyShipped != 0
        AND DATE(a.dueDate) = DATE(NOW())
      ORDER BY a.priority ASC, a.createdDate ASC
    `;

    return this.rawQuery<RowDataPacket>(sql);
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

  async getGraphicsDemandByWo(woNumber: string): Promise<RowDataPacket | null> {
    const sql = `
      SELECT so
        , line
      FROM eyefidb.graphicsDemand
      WHERE woNumber = ?
      LIMIT 1
    `;

    const rows = await this.rawQuery<RowDataPacket>(sql, [woNumber]);
    return rows[0] || null;
  }

  async getBomInformationTest(partNumber: string): Promise<RowDataPacket | null> {
    if (!partNumber) {
      return null;
    }

    const withRevisionSql = `
      SELECT SKU_Number
        , Product productName
        , ID_Product
        , Account_Vendor
        , DD1_1
        , DD1_5
        , DD1_6
        , DD2_8
        , DD2_6
        , DD3_2
        , DD3_1
        , DD3_3
        , DD3_9
        , DI_Product_SQL
        , DD3_8
        , DD2_1
        , DD3_6
        , Category
        , Serial_Number
        , DD2_2
        , DD1_7
        , DD2_9
        , DD2_7
        , DD1_2
        , Image_Data
        , v.revision
      FROM eyefidb.graphicsInventory
      JOIN eyefidb.graphicsInventoryView v ON v.part_number = eyefidb.graphicsInventory.SKU_Number
      WHERE SKU_Number = ?
      ORDER BY eyefidb.graphicsInventory.id DESC
      LIMIT 1
    `;

    const withRevisionRows = await this.rawQuery<RowDataPacket>(withRevisionSql, [partNumber]);
    const latestWithRevision = withRevisionRows[0];

    if (latestWithRevision?.['SKU_Number'] && latestWithRevision?.['revision']) {
      const revisionSql = `
        SELECT SKU_Number
          , Product productName
          , ID_Product
          , Account_Vendor
          , DD1_1
          , DD1_5
          , DD1_6
          , DD2_8
          , DD2_6
          , DD3_2
          , DD3_1
          , DD3_3
          , DD3_9
          , DI_Product_SQL
          , DD3_8
          , DD2_1
          , DD3_6
          , Category
          , Serial_Number
          , DD2_2
          , DD1_7
          , DD2_9
          , DD2_7
          , DD1_2
          , Image_Data
        FROM eyefidb.graphicsInventory
        WHERE SKU_Number = ?
          AND DD3_9 = ?
        ORDER BY id DESC
        LIMIT 1
      `;

      const revisionRows = await this.rawQuery<RowDataPacket>(revisionSql, [
        String(latestWithRevision['SKU_Number']),
        String(latestWithRevision['revision']),
      ]);

      if (revisionRows[0]) {
        return revisionRows[0];
      }
    }

    const fallbackSql = `
      SELECT SKU_Number
        , Product productName
        , ID_Product
        , Account_Vendor
        , DD1_1
        , DD1_5
        , DD1_6
        , DD2_8
        , DD2_6
        , DD3_2
        , DD3_1
        , DD3_3
        , DD3_9
        , DI_Product_SQL
        , DD3_8
        , DD2_1
        , DD3_6
        , Category
        , Serial_Number
        , DD2_2
        , DD1_7
        , DD2_9
        , DD2_7
        , DD1_2
        , Image_Data
      FROM eyefidb.graphicsInventory
      WHERE (
        ID_PRODUCT = ?
        OR SKU_Number = ?
      )
        AND Status = 'Active'
      ORDER BY id DESC
      LIMIT 1
    `;

    const fallbackRows = await this.rawQuery<RowDataPacket>(fallbackSql, [partNumber, partNumber]);
    return fallbackRows[0] || null;
  }
}
