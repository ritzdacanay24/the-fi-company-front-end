import { Injectable, Logger } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { QadOdbcService } from '@/shared/database/qad-odbc.service';
import { ScheduledJobHandler, ScheduledJobRunResultDto } from './scheduled-job.handler';

interface QadWorkOrder extends RowDataPacket {
  WO_NBR: string;
  WO_ORD_DATE: string;
  WO_REL_DATE: string;
  WO_DUE_DATE: string;
  WO_PART: string;
  WO_QTY_ORD: number;
  WO_QTY_COMP: number;
  WO_STATUS: string;
  WO_RMKS: string;
  WO_CLOSE_DATE: string | null;
  FULLDESC: string;
  WO_SO_JOB: string;
}

interface GraphicsScheduleLocal extends RowDataPacket {
  graphicsWorkOrder: string;
  itemNumber: string;
}

@Injectable()
export class GraphicsWorkOrderHandler implements ScheduledJobHandler {
  private readonly logger = new Logger(GraphicsWorkOrderHandler.name);

  constructor(
    private readonly mysqlService: MysqlService,
    private readonly qadOdbcService: QadOdbcService,
  ) {}

  async handle(trigger: 'manual' | 'cron'): Promise<ScheduledJobRunResultDto> {
    const startedAtMs = Date.now();
    let createdCount = 0;

    try {
      // Step 1: Get all existing graphics work orders from local MySQL
      const existingWO = await this.getExistingGraphicsWorkOrders();
      const woInList = existingWO.map((wo) => `'${wo.graphicsWorkOrder}'`).join(',');
      const woNotInClause = woInList ? `AND a.wo_nbr NOT IN (${woInList})` : '';

      // Step 2: Query QAD for graphics work orders that don't exist locally
      const qadWorkOrders = await this.getGraphicsWorkOrdersFromQad(woNotInClause);

      // Step 3: Create graphics schedule records for each QAD work order
      for (const workOrder of qadWorkOrders) {
        try {
          await this.createGraphicsScheduleRecord(workOrder);
          createdCount++;
          this.logger.log(`Created graphics schedule for work order ${workOrder.WO_NBR}`);
        } catch (recordError) {
          this.logger.warn(
            `Failed to create graphics schedule for WO ${workOrder.WO_NBR}: ${recordError}`,
          );
        }
      }

      const durationMs = Date.now() - startedAtMs;
      this.logger.log(
        `[${trigger}] graphics-work-order -> ${createdCount} work orders created in ${durationMs}ms`,
      );

      return {
        id: 'graphics-work-order',
        name: 'Graphics Work Order Creation',
        trigger,
        ok: true,
        statusCode: 200,
        durationMs,
        message: `${createdCount} graphics work orders created.`,
        lastRun: {
          startedAt: new Date(startedAtMs).toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs,
          status: 'success',
          triggerType: trigger,
          errorMessage: null,
        },
      };
    } catch (error: unknown) {
      const durationMs = Date.now() - startedAtMs;
      const message = error instanceof Error ? error.message : String(error);
      const odbcErrors = (error as Record<string, unknown>)?.odbcErrors;
      this.logger.error(`[${trigger}] graphics-work-order failed in ${durationMs}ms: ${message}`);
      if (odbcErrors) {
        this.logger.error(`[${trigger}] graphics-work-order ODBC errors: ${JSON.stringify(odbcErrors, null, 2)}`);
      }

      return {
        id: 'graphics-work-order',
        name: 'Graphics Work Order Creation',
        trigger,
        ok: false,
        statusCode: 500,
        durationMs,
        message,
        lastRun: {
          startedAt: new Date(startedAtMs).toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs,
          status: 'failure',
          triggerType: trigger,
          errorMessage: message,
        },
      };
    }
  }

  /**
   * Get all active graphics work orders from local MySQL database
   * (work orders already scheduled)
   */
  private async getExistingGraphicsWorkOrders(): Promise<GraphicsScheduleLocal[]> {
    return this.mysqlService.query<GraphicsScheduleLocal[]>(`
      SELECT graphicsWorkOrder, itemNumber
      FROM eyefidb.graphicsSchedule
      WHERE active = 1
      AND (CHAR_LENGTH(graphicsWorkOrder) = 4 OR CHAR_LENGTH(graphicsWorkOrder) = 5)
    `);
  }

  /**
   * Query QAD for graphics work orders that match criteria:
   * - Operations 040, 050, 060, 070
   * - Part type is 'Graphic'
   * - Qty ordered > Qty completed
   * - Work order status != 'C' (Closed)
   * - Work order not already in local schedule
   * - Work order number is 5 characters
   */
  private async getGraphicsWorkOrdersFromQad(
    woNotInClause: string,
  ): Promise<QadWorkOrder[]> {
    const sql = `
      SELECT 
        a.wo_nbr,
        a.wo_ord_date,
        a.wo_rel_date,
        a.wo_due_date,
        a.wo_part,
        a.wo_qty_ord,
        a.wo_qty_comp,
        a.wo_status,
        a.wo_rmks,
        a.wo_close_date,
        c.fullDesc,
        a.wo_so_job
      FROM wr_route b
      LEFT JOIN (
        SELECT 
          wo_nbr, wo_ord_date, wo_rel_date, wo_due_date, wo_part, wo_qty_ord, wo_qty_comp, 
          wo_status, wo_rmks, wo_close_date, wo_so_job
        FROM wo_mstr a
        WHERE wo_domain = 'EYE'
      ) a ON a.wo_nbr = b.wr_nbr
      LEFT JOIN (
        SELECT pt_part, MAX(pt_desc1 + ' ' + pt_desc2) as fullDesc, MAX(pt_part_type) as pt_part_type
        FROM pt_mstr
        WHERE pt_domain = 'EYE'
        GROUP BY pt_part
      ) c ON c.pt_part = b.wr_part
      WHERE b.wr_op IN (040, 050, 060, 070)
      AND b.wr_domain = 'EYE'
      AND (a.wo_qty_ord - a.wo_qty_comp) > 0
      ${woNotInClause}
      AND c.pt_part_type = 'Graphic'
      AND LEN(a.wo_nbr) = 5
      AND a.wo_status != 'C'
    `;

    return this.qadOdbcService.query<QadWorkOrder[]>(sql);
  }

  /**
   * Create a graphics schedule record in MySQL from a QAD work order
   */
  private async createGraphicsScheduleRecord(workOrder: QadWorkOrder): Promise<void> {
    const nowDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const priority = 10; // Default priority, could be enhanced to check for conditions
    const criticalOrder = workOrder.WO_SO_JOB === 'DROPIN' ? 1 : 0;
    const purchaseOrder = 'N/A';
    const customerPartNumber = 'N/A';
    const customer = 'N/A';
    const graphicsSalesOrder = 0;
    const partials = 0;
    const prototypeCheck = 0;
    const plexRequired = 0;
    const userId = 0; // Scheduled job user ID

    // Clean description of non-printable characters
    const cleanDesc = workOrder.FULLDESC.replace(/[\x00-\x1F\x7F-\xFF]/g, '');

    // Offset due date: push back 2-4 days based on day of week (avoid weekends)
    const rawDue = new Date(workOrder.WO_DUE_DATE);
    const dow = rawDue.getDay(); // 0=Sun,1=Mon,...,6=Sat
    const offsetDays = (dow === 0) ? 2 : (dow === 1 || dow === 2) ? 4 : 2;
    rawDue.setDate(rawDue.getDate() - offsetDays);
    const adjustedDueDate = rawDue.toISOString().slice(0, 10);

    // Insert new graphics schedule record
    const insertSql = `
      INSERT INTO eyefidb.graphicsSchedule(
        itemNumber, description, customer, qty, dueDate, customerPartNumber,
        purchaseOrder, userId, createdDate, priority, status, partials,
        prototypeCheck, origDueDate, graphicsWorkOrder, instructions, plexRequired,
        graphicsSalesOrder, criticalOrder, ordered_date, active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await this.mysqlService.execute(insertSql, [
      workOrder.WO_PART,
      cleanDesc,
      customer,
      workOrder.WO_QTY_ORD,
      adjustedDueDate,       // dueDate (offset by day-of-week)
      customerPartNumber,
      purchaseOrder,
      userId,
      nowDate,
      priority,
      0, // status
      partials,
      prototypeCheck,
      workOrder.WO_DUE_DATE, // origDueDate (raw from QAD)
      workOrder.WO_NBR, // graphicsWorkOrder
      workOrder.WO_RMKS, // instructions
      plexRequired,
      graphicsSalesOrder,
      criticalOrder,
      workOrder.WO_ORD_DATE, // ordered_date
      1, // active
    ]);

    // Get the last inserted ID and update orderNum
    if (result && typeof result === 'object' && 'insertId' in result && result.insertId) {
      const lastInsertId = Number(result.insertId);
      const updatedId = `G${lastInsertId}`;

      const updateSql = `
        UPDATE eyefidb.graphicsSchedule
        SET orderNum = ?
        WHERE id = ?
      `;

      await this.mysqlService.query(updateSql, [updatedId, lastInsertId]);

      // Insert user transaction record
      const userTransSql = `
        INSERT INTO eyefidb.userTrans (
          field, o, n, createDate, comment, userId, so, type, partNumber, reasonCode
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await this.mysqlService.query(userTransSql, [
        'New Graphics WO Created',
        0,
        updatedId,
        nowDate,
        'Created by task',
        userId,
        updatedId,
        'Graphics',
        workOrder.WO_PART,
        '',
      ]);
    }
  }
}
