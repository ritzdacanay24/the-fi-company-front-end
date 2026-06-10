import { Inject, Injectable } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { QadOdbcService } from '@/shared/database/qad-odbc.service';

@Injectable()
export class GraphicsDemandService {
  private ignoreColumnReady?: Promise<void>;

  constructor(
    @Inject(MysqlService) private readonly mysqlService: MysqlService,
    @Inject(QadOdbcService) private readonly qadOdbcService: QadOdbcService,
  ) {}

  async getReport(): Promise<unknown> {
    return this.getGraphicsDemandReport(300);
  }

  async createOrUpdate(payload: Record<string, unknown>): Promise<unknown> {
    await this.ensureIgnoredFromPlanningColumn();

    const data = {
      ...payload,
      active: Number(payload?.active ?? 1),
      ignoredFromPlanning: Number(payload?.ignoredFromPlanning ?? 0) === 1 ? 1 : 0,
      createdBy: Number(payload?.createdBy ?? 0),
      lastModBy: Number(payload?.lastModBy ?? payload?.createdBy ?? 0),
      lastModDate: this.nowDateTime(),
      createdDate: String(payload?.createdDate || this.nowDateTime()),
      so: String(payload?.so || ''),
      line: Number(payload?.line ?? 0),
      part: String(payload?.part || ''),
      parentComponent: String(payload?.parentComponent || ''),
      uniqueId: String(payload?.uniqueId || ''),
      poNumber: String(payload?.poNumber || ''),
      woNumber: String(payload?.woNumber || ''),
      graphicsWorkOrderNumber: String(payload?.graphicsWorkOrderNumber || ''),
      graphicsSalesOrder: String(payload?.graphicsSalesOrder || ''),
    };

    const id = Number(payload?.id ?? 0);
    const existing = id ? await this.getById(id) : null;
    const idLast = existing ? await this.updateById(data, id) : await this.insert(data);

    const response: Record<string, unknown> = {
      idLast,
      ignoredFromPlanning: data.ignoredFromPlanning,
    };

    if (data.woNumber) {
      const graphicsInfo = await this.getMaxStatusFromGraphicsScheduleByWorkOrderNumber(data.woNumber);
      response.graphicsStatus = graphicsInfo?.status || 'No Status found';
      response.graphicsWorkOrderNumber = graphicsInfo?.graphicsWorkOrder || 'No work order found';
      response.graphicsSalesOrder = '';
      return response;
    }

    if (data.poNumber) {
      const graphicsInfo = await this.getGraphicsScheduleInfoByPoAndItemNumber(data.poNumber, data.part);
      response.graphicsStatus = graphicsInfo?.status || 'No Status found';
      response.graphicsWorkOrderNumber = graphicsInfo?.graphicsWorkOrder || 'No work order found';
      response.graphicsSalesOrder = graphicsInfo?.graphicsSalesOrder || 'No sales order found';
      return response;
    }

    response.graphicsStatus = '';
    response.graphicsWorkOrderNumber = '';
    response.graphicsSalesOrder = '';
    return response;
  }

  private async getGraphicsDemandReport(toDate = 300): Promise<Array<Record<string, unknown>>> {
    await this.ensureIgnoredFromPlanningColumn();

    const dateTo = this.addDays(this.todayDate(), toDate);

    const [commentInfo, statusInfo, result] = await Promise.all([
      this.getComments(),
      this.getGraphicsDemandStatusInfo(),
      this.getSalesOrderDetailsByDate(dateTo),
    ]);

    if (!result.length) {
      return [];
    }

    const parts = Array.from(
      new Set(result.map((row) => String(row.SOD_PART || '')).filter((part) => !!part)),
    );

    const resultsProduct = parts.length
      ? await this.getProductStructureInfoByPartNumbers(parts)
      : [];

    return this.restructureData(result, resultsProduct, statusInfo, commentInfo);
  }

  private async getComments(): Promise<Array<Record<string, unknown>>> {
    const sql = `
      SELECT a.orderNum
        , CASE WHEN a.comments_html != '' THEN comments_html ELSE comments END comments
        , DATE(a.createdDate) createdDate
      FROM eyefidb.comments a
      INNER JOIN (
        SELECT orderNum, MAX(id) id
        FROM eyefidb.comments
        GROUP BY orderNum
      ) b ON a.orderNum = b.orderNum AND a.id = b.id
      WHERE type = 'Graphics Demand'
    `;

    return this.mysqlService.query<RowDataPacket[]>(sql);
  }

  private async getGraphicsDemandStatusInfo(): Promise<Array<Record<string, unknown>>> {
    const sql = `
      SELECT a.so
        , a.line
        , a.id
        , a.part
        , a.uniqueId
        , a.poNumber
        , a.active
        , IFNULL(a.ignoredFromPlanning, 0) ignoredFromPlanning
        , CASE WHEN a.woNumber != '' THEN c.graphicsWorkOrder ELSE b.graphicsWorkOrder END graphicsWorkOrderNumber
        , b.graphicsSalesOrder
        , CASE WHEN a.woNumber != '' THEN c.status ELSE b.status END graphicsStatus
        , b.graphicsWorkOrder
        , CONCAT(usr.first, ' ', usr.last) createdBy
        , a.woNumber
      FROM eyefidb.graphicsDemand a
      LEFT JOIN (
        SELECT a.poNumber
          , a.poLine
          , a.graphicsWorkOrderNumber graphicsWorkOrder
          , a.partNumber
          , c.name status
          , b.graphicsSalesOrder
        FROM eyefidb.graphicsWorkOrderCreation a
        LEFT JOIN eyefidb.graphicsSchedule b ON b.graphicsWorkOrder = a.graphicsWorkOrderNumber
        LEFT JOIN eyefidb.graphicsQueues c ON c.queueStatus = b.status
        WHERE a.active = 1
      ) b ON b.poNumber = a.poNumber AND b.partNumber = a.part
      LEFT JOIN (
        SELECT a.graphicsWorkOrder
          , c.name status
        FROM eyefidb.graphicsSchedule a
        LEFT JOIN eyefidb.graphicsQueues c ON c.queueStatus = a.status
        WHERE a.active = 1
      ) c ON c.graphicsWorkOrder = a.woNumber
      LEFT JOIN db.users usr ON usr.id = a.createdBy
    `;

    return this.mysqlService.query<RowDataPacket[]>(sql);
  }

  private async getSalesOrderDetailsByDate(dateTo: string): Promise<Array<Record<string, unknown>>> {
    const sql = `
      SELECT a.sod_nbr sod_nbr
        , a.sod_due_date sod_due_date
        , CASE WHEN b.pt_bom_code != '' THEN b.pt_bom_code ELSE a.sod_part END sod_part
        , a.sod_qty_ord sod_qty_ord
        , a.sod_qty_ship sod_qty_ship
        , a.sod_price sod_price
        , a.sod_contr_id sod_contr_id
        , a.sod_domain sod_domain
        , a.sod_compl_stat sod_compl_stat
        , a.sod_price*(a.sod_qty_ord-a.sod_qty_ship) openBalance
        , a.sod_qty_ord-a.sod_qty_ship qtyOpen
        , b.pt_desc1 pt_desc1
        , b.pt_desc2 pt_desc2
        , CASE WHEN b.pt_part IS NULL THEN a.sod_desc ELSE CONCAT(b.pt_desc1, b.pt_desc2) END fullDesc
        , c.so_cust so_cust
        , a.sod_line sod_line
        , c.so_ord_date so_ord_date
        , c.so_ship so_ship
        , sod_order_category sod_order_category
        , a.sod_custpart cp_cust_part
        , IFNULL(e.ld_qty_oh, 0) ld_qty_oh
        , c.so_bol so_bol
        , sod_cmtindx so_cmtindx
        , pt_routing pt_routing
        , a.sod_list_pr sod_list_pr
        , b.pt_pm_code pt_pm_code
        , b.pt_prod_line pt_prod_line
        , b.pt_part_type
        , b.pt_phantom
      FROM sod_det a
      LEFT JOIN (
        SELECT pt_part
          , pt_desc1
          , pt_desc2
          , MAX(pt_routing) pt_routing
          , MAX(pt_pm_code) pt_pm_code
          , MAX(pt_bom_code) pt_bom_code
          , MAX(pt_prod_line) pt_prod_line
          , MAX(pt_part_type) pt_part_type
          , MAX(pt_phantom) pt_phantom
        FROM pt_mstr
        WHERE pt_domain = 'EYE'
        GROUP BY pt_part, pt_desc1, pt_desc2
      ) b ON b.pt_part = a.sod_part
      LEFT JOIN (
        SELECT so_nbr
          , so_cust
          , so_ord_date
          , so_ship
          , so_bol
          , so_cmtindx
          , so_compl_date
        FROM so_mstr
        WHERE so_domain = 'EYE'
      ) c ON c.so_nbr = a.sod_nbr
      LEFT JOIN (
        SELECT a.ld_part
          , SUM(a.ld_qty_oh) ld_qty_oh
        FROM ld_det a
        WHERE ld_domain = 'EYE'
          AND a.ld_loc = 'LVFG'
        GROUP BY a.ld_part
      ) e ON e.ld_part = a.sod_part
      WHERE sod_domain = 'EYE'
        AND sod_qty_ord != sod_qty_ship
        AND a.sod_due_date <= ?
        AND so_compl_date IS NULL
      ORDER BY a.sod_due_date ASC
      WITH (NOLOCK)
    `;

    return this.qadOdbcService.queryWithParams<Array<Record<string, unknown>>>(sql, [dateTo], {
      keyCase: 'upper',
    });
  }

  private async getProductStructureInfoByPartNumbers(
    partNumbers: string[],
  ): Promise<Array<Record<string, unknown>>> {
    const placeholders = partNumbers.map(() => '?').join(', ');
    const sql = `
      SELECT t1.ps_par parent
        , t1.ps_comp parent_component
        , t1.ps_qty_per parent_comp_qty
        , MAX(t1.ps_end) parent_ps_end
        , a.pt_desc1 parent_desc
        , a.pt_um parent_um
        , a.pt_pm_code parent_pt_pm_code
        , a.pt_prod_line parent_pt_prod_line
        , a.pt_bom_code parent_bom_code
        , parent_pt_phantom
        , t2.ps_comp AS parent_category
        , t2.ps_qty_per parent_category_qty
        , MAX(t2.ps_end) parent_category_ps_end
        , d.pt_desc1 parent_category_desc
        , d.pt_um parent_category_um
        , d.pt_pm_code parent_sub_pt_pm_code
        , d.pt_prod_line parent_sub_pt_prod_line
        , d.pt_bom_code parent_sub_bom_code
        , parent_sub_pt_phantom
      FROM ps_mstr t1
      LEFT JOIN ps_mstr t2 ON t1.ps_comp = t2.ps_par AND t2.ps_domain = 'EYE'
      LEFT JOIN (
        SELECT pt_part
          , MAX(pt_desc1) pt_desc1
          , MAX(pt_um) pt_um
          , MAX(pt_pm_code) pt_pm_code
          , MAX(pt_prod_line) pt_prod_line
          , MAX(pt_bom_code) pt_bom_code
          , MAX(pt_phantom) parent_pt_phantom
        FROM pt_mstr
        WHERE pt_domain = 'EYE'
          AND pt_part_type != 'GraphKit'
        GROUP BY pt_part
      ) a ON t1.ps_comp = a.pt_part
      LEFT JOIN (
        SELECT pt_part
          , MAX(pt_desc1) pt_desc1
          , MAX(pt_um) pt_um
          , MAX(pt_pm_code) pt_pm_code
          , MAX(pt_prod_line) pt_prod_line
          , MAX(pt_bom_code) pt_bom_code
          , MAX(pt_phantom) parent_sub_pt_phantom
        FROM pt_mstr
        WHERE pt_domain = 'EYE'
          AND pt_part_type != 'GraphKit'
        GROUP BY pt_part
      ) d ON t2.ps_comp = d.pt_part
      WHERE t1.ps_par IN (${placeholders})
        AND t1.ps_domain = 'EYE'
        AND (d.pt_prod_line = 014 OR a.pt_prod_line = 014)
      GROUP BY t1.ps_par
        , t1.ps_comp
        , t1.ps_qty_per
        , a.pt_desc1
        , a.pt_um
        , a.pt_pm_code
        , a.pt_prod_line
        , a.pt_bom_code
        , a.parent_pt_phantom
        , t2.ps_comp
        , t2.ps_qty_per
        , d.pt_desc1
        , d.pt_um
        , d.pt_pm_code
        , d.pt_prod_line
        , d.pt_bom_code
        , parent_sub_pt_phantom
      ORDER BY t1.ps_comp, t2.ps_comp ASC
      WITH (NOLOCK)
    `;

    return this.qadOdbcService.queryWithParams<Array<Record<string, unknown>>>(sql, partNumbers, {
      keyCase: 'upper',
    });
  }

  private async getMiscInfoBySalesOrderNumbers(ids: string[]): Promise<Array<Record<string, unknown>>> {
    if (!ids.length) {
      return [];
    }

    const placeholders = ids.map(() => '?').join(', ');
    const sql = `
      SELECT *
      FROM eyefidb.workOrderOwner a
      WHERE a.so IN (${placeholders})
    `;

    return this.mysqlService.query<RowDataPacket[]>(sql, ids);
  }

  private async getPartMasterByPart(part: string): Promise<Record<string, unknown> | null> {
    const sql = `
      SELECT pt_part
        , pt_pm_code
        , pt_phantom
      FROM pt_mstr
      WHERE pt_domain = 'EYE'
        AND pt_part = ?
    `;

    const rows = await this.qadOdbcService.queryWithParams<Array<Record<string, unknown>>>(sql, [part], {
      keyCase: 'upper',
    });
    return rows[0] || null;
  }

  private async getById(id: number): Promise<Record<string, unknown> | null> {
    const sql = `
      SELECT *
      FROM eyefidb.graphicsDemand a
      WHERE id = ?
      LIMIT 1
    `;

    const rows = await this.mysqlService.query<RowDataPacket[]>(sql, [id]);
    return rows[0] || null;
  }

  private async updateById(data: Record<string, unknown>, id: number): Promise<number> {
    const sql = `
      UPDATE eyefidb.graphicsDemand
      SET active = ?
        , ignoredFromPlanning = ?
        , poNumber = ?
        , graphicsWorkOrderNumber = ?
        , graphicsSalesOrder = ?
        , lastModBy = ?
        , lastModDate = ?
        , woNumber = ?
      WHERE id = ?
    `;

    await this.mysqlService.execute<ResultSetHeader>(sql, [
      Number(data.active || 1),
      Number(data.ignoredFromPlanning || 0),
      String(data.poNumber || ''),
      String(data.graphicsWorkOrderNumber || ''),
      String(data.graphicsSalesOrder || ''),
      Number(data.lastModBy || 0),
      String(data.lastModDate || this.nowDateTime()),
      String(data.woNumber || ''),
      id,
    ]);

    return id;
  }

  private async insert(data: Record<string, unknown>): Promise<number> {
    const sql = `
      INSERT INTO eyefidb.graphicsDemand (
        so
        , line
        , parentComponent
        , uniqueId
        , part
        , createdBy
        , ignoredFromPlanning
        , poNumber
        , woNumber
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await this.mysqlService.execute<ResultSetHeader>(sql, [
      String(data.so || ''),
      Number(data.line || 0),
      String(data.parentComponent || ''),
      String(data.uniqueId || ''),
      String(data.part || ''),
      Number(data.createdBy || 0),
      Number(data.ignoredFromPlanning || 0),
      String(data.poNumber || ''),
      String(data.woNumber || ''),
    ]);

    return result.insertId;
  }

  private async getMaxStatusFromGraphicsScheduleByWorkOrderNumber(
    woNumber: string,
  ): Promise<Record<string, unknown> | null> {
    const sql = `
      SELECT graphicsWorkOrder
        , MAX(c.name) status
      FROM eyefidb.graphicsSchedule a
      LEFT JOIN eyefidb.graphicsQueues c ON c.queueStatus = a.status
      WHERE a.active = 1
        AND graphicsWorkOrder = ?
      GROUP BY graphicsWorkOrder
      LIMIT 1
    `;

    const rows = await this.mysqlService.query<RowDataPacket[]>(sql, [woNumber]);
    return rows[0] || null;
  }

  private async getGraphicsScheduleInfoByPoAndItemNumber(
    poNumber: string,
    itemNumber: string,
  ): Promise<Record<string, unknown> | null> {
    const sql = `
      SELECT purchaseOrder
        , itemNumber
        , graphicsWorkOrder
        , graphicsSalesOrder
        , MAX(c.name) status
      FROM eyefidb.graphicsSchedule a
      LEFT JOIN eyefidb.graphicsQueues c ON c.queueStatus = a.status
      WHERE a.active = 1
        AND purchaseOrder = ?
        AND customerPartNumber = ?
      GROUP BY purchaseOrder
        , itemNumber
        , graphicsWorkOrder
        , graphicsSalesOrder
      LIMIT 1
    `;

    const rows = await this.mysqlService.query<RowDataPacket[]>(sql, [poNumber, itemNumber]);
    return rows[0] || null;
  }

  private async restructureData(
    result: Array<Record<string, unknown>>,
    resultsProduct: Array<Record<string, unknown>>,
    statusInfo: Array<Record<string, unknown>>,
    commentInfo: Array<Record<string, unknown>>,
  ): Promise<Array<Record<string, unknown>>> {
    const obj: Array<Record<string, unknown>> = [];

    for (const row1 of result) {
      const sodPart = String(row1.SOD_PART || '');
      if (String(row1.PT_PROD_LINE || '') === '014' && !sodPart.includes('THK')) {
        obj.push({
          part: sodPart,
          salesOrderQty: Number(row1.QTYOPEN || 0),
          qtyNeeded: Number(row1.QTYOPEN || 0),
          qtyPer: Number(row1.QTYOPEN || 0),
          parentQtyPer: 0,
          sod_nbr: row1.SOD_NBR,
          sod_due_date: row1.SOD_DUE_DATE,
          pt_desc: row1.FULLDESC,
          SOItem: sodPart,
          level: 0,
          sod_line: row1.SOD_LINE,
          parentComponent: sodPart,
          code: row1.PT_PM_CODE,
          so_ord_date: row1.SO_ORD_DATE,
          so_ship: row1.SO_SHIP,
          sod_contr_id: row1.SOD_CONTR_ID,
          PT_PART_TYPE: row1.PT_PART_TYPE,
          pt_bom_code: row1.PT_PM_CODE,
          pt_phantom: row1.PT_PHANTOM,
        });
      }
    }

    for (const row of resultsProduct) {
      for (const row1 of result) {
        if (String(row1.SOD_PART || '') !== String(row.PARENT || '')) {
          continue;
        }

        if (String(row.PARENT_PT_PROD_LINE || '') === '014') {
          obj.push({
            part: row.PARENT_COMPONENT,
            salesOrderQty: Number(row1.QTYOPEN || 0),
            qtyNeeded: Number(row1.QTYOPEN || 0) * Number(row.PARENT_COMP_QTY || 0),
            qtyPer: Number(row.PARENT_COMP_QTY || 0),
            parentQtyPer: Number(row.PARENT_COMP_QTY || 0),
            sod_nbr: row1.SOD_NBR,
            sod_due_date: row1.SOD_DUE_DATE,
            pt_desc: row.PARENT_DESC,
            SOItem: row1.SOD_PART,
            level: 1,
            sod_line: row1.SOD_LINE,
            parentComponent: row.PARENT_COMPONENT,
            code: row.PARENT_PT_PM_CODE,
            so_ord_date: row1.SO_ORD_DATE,
            parent_ps_end: row.PARENT_PS_END,
            so_ship: row1.SO_SHIP,
            sod_contr_id: row1.SOD_CONTR_ID,
            pt_bom_code: row.PARENT_BOM_CODE,
            pt_phantom: row.PARENT_PT_PHANTOM,
          });
        }

        if (String(row.PARENT_SUB_PT_PROD_LINE || '') === '014') {
          const parentCategory = String(row.PARENT_CATEGORY || '');
          obj.push({
            part: parentCategory,
            salesOrderQty: Number(row1.QTYOPEN || 0),
            qtyNeeded:
              Number(row1.QTYOPEN || 0) *
              Number(row.PARENT_COMP_QTY || 0) *
              Number(row.PARENT_CATEGORY_QTY || 0),
            qtyPer: Number(row.PARENT_CATEGORY_QTY || 0),
            parentQtyPer: Number(row.PARENT_COMP_QTY || 0),
            sod_nbr: row1.SOD_NBR,
            sod_due_date: row1.SOD_DUE_DATE,
            pt_desc: row.PARENT_CATEGORY_DESC,
            SOItem: row1.SOD_PART,
            level: 2,
            sod_line: row1.SOD_LINE,
            parentComponent: row.PARENT_COMPONENT,
            code: parentCategory === 'EYE9951' ? 'M' : row.PARENT_PT_PM_CODE,
            so_ord_date: row1.SO_ORD_DATE,
            parent_ps_end: row.PARENT_CATEGORY_PS_END,
            so_ship: row1.SO_SHIP,
            sod_contr_id: row1.SOD_CONTR_ID,
            pt_bom_code: row.PARENT_SUB_BOM_CODE,
            pt_phantom: row.PARENT_SUB_PT_PHANTOM,
          });
        }
      }
    }

    const ids = obj.map(
      (r) => `${r.sod_nbr}-${r.sod_line}-${r.parentComponent}-${r.part}`,
    );
    const miscInfo = await this.getMiscInfoBySalesOrderNumbers(ids);

    const miscMap = new Map<string, Record<string, unknown>>();
    for (const row of miscInfo) {
      miscMap.set(String(row.so || ''), row);
    }

    const statusMap = new Map<string, Record<string, unknown>>();
    for (const row of statusInfo) {
      statusMap.set(String(row.uniqueId || ''), row);
    }

    const commentMap = new Map<string, Record<string, unknown>>();
    for (const row of commentInfo) {
      commentMap.set(String(row.orderNum || ''), row);
    }

    const partMasterCache = new Map<string, Record<string, unknown> | null>();
    const today = this.todayDate();

    for (const r of obj) {
      const rowId = `${r.sod_nbr}-${r.sod_line}-${r.parentComponent}-${r.part}`;
      r.checked = 'Not Ordered';
      r.id = rowId;
      r.graphicsStatus = '';
      r.graphicsWorkOrderNumber = '';
      r.graphicsSalesOrder = '';
      r.poEnteredBy = '';
      r.woNumber = '';
      r.misc = miscMap.get(rowId) || {};

      if (!r.code) {
        const part = String(r.part || '');
        if (!partMasterCache.has(part)) {
          partMasterCache.set(part, await this.getPartMasterByPart(part));
        }
        const found = partMasterCache.get(part);
        if (found?.PT_PM_CODE) {
          r.code = found.PT_PM_CODE;
        }
      }

      const status = statusMap.get(rowId);
      if (status) {
        r.checked = Number(status.active || 0) === 1 ? 'Ordered' : 'Not Ordered';
        r.checkedId = status.id;
        r.ignoredFromPlanning = Number(status.ignoredFromPlanning || 0) === 1;
        r.poNumber = status.poNumber;
        r.poEnteredBy = status.createdBy;
        r.woNumber = status.woNumber;
        r.graphicsStatus = status.graphicsStatus;
        r.graphicsWorkOrderNumber = status.graphicsWorkOrderNumber;
        r.graphicsSalesOrder = status.graphicsSalesOrder;
      }

      r.COMMENTS = false;
      r.COMMENTSMAX = '';
      r.COMMENTSCLASS = '';
      const comment = commentMap.get(rowId);
      if (comment) {
        r.COMMENTS = true;
        r.COMMENTSMAX = comment.comments;
        r.COMMENTSCLASS = String(comment.createdDate || '') === today ? 'text-success' : 'text-info';
      }
    }

    return obj;
  }

  private async getLegacyBomStructureReport(
    daysOut: number,
    maxBomLevels: number,
    showOnlyLevel: number | null,
    salesOrderNumber: string | null,
    showOnlyGraphics: boolean,
  ): Promise<Array<Record<string, unknown>>> {
    const targetDate = this.addDays(this.todayDate(), daysOut);
    const salesOrderParts = await this.getBomSalesOrderParts(targetDate, salesOrderNumber);

    if (!salesOrderParts.length) {
      return [];
    }

    const allSoPartNumbers = Array.from(new Set(salesOrderParts.map((row) => String(row['part_number'] || '')).filter(Boolean)));
    const routingInfo = await this.getBomPartRoutingInfo(allSoPartNumbers);

    const allBomData: Array<Record<string, unknown>> = [];
    const processedParts = new Set<string>();
    let currentLevelParts = [...allSoPartNumbers];

    for (let level = 1; level <= maxBomLevels; level += 1) {
      const pendingParts = currentLevelParts.filter((part) => !processedParts.has(part));
      if (!pendingParts.length) {
        break;
      }

      const levelBomData = await this.getBomHierarchyForMultipleParts(pendingParts);
      if (!levelBomData.length) {
        break;
      }

      pendingParts.forEach((part) => processedParts.add(part));
      allBomData.push(...levelBomData);
      currentLevelParts = Array.from(new Set(levelBomData.map((row) => String(row['component_part'] || '')).filter(Boolean)));
    }

    const allParts = Array.from(
      new Set([
        ...allSoPartNumbers,
        ...allBomData.map((row) => String(row['component_part'] || '')).filter(Boolean),
      ]),
    );
    const allPartsLookup = await this.getAllPartsLookup(allParts);

    const result: Array<Record<string, unknown>> = [];

    for (const soPart of salesOrderParts) {
      const soPartNumber = String(soPart['part_number'] || '');
      const openQuantity = Number(soPart['open_quantity'] || 0);
      const partInfo = allPartsLookup.get(soPartNumber) || {};
      const soPartProdLine = String(partInfo['product_line'] || '');
      const isGraphicsPart = soPartProdLine === '014';

      if ((showOnlyLevel === null || showOnlyLevel === 0) && (!showOnlyGraphics || isGraphicsPart)) {
        const soIsParent = this.isComponentAlsoParent(soPartNumber, allBomData);
        result.push({
          sales_order: soPart['sales_order'],
          line_number: soPart['line_number'],
          so_part: soPartNumber,
          due_date: soPart['due_date'],
          open_quantity: openQuantity,
          item_part: soPartNumber,
          item_description: String(partInfo['description'] || ''),
          item_status: String(partInfo['status'] || ''),
          graphics_part: isGraphicsPart ? soPartNumber : null,
          graphics_description: isGraphicsPart ? String(partInfo['description'] || '') : '',
          graphics_description2: isGraphicsPart ? String(partInfo['description2'] || '') : '',
          part_type: isGraphicsPart ? String(partInfo['part_type'] || '') : '',
          status: isGraphicsPart ? String(partInfo['status'] || '') : '',
          pm_code: isGraphicsPart ? String(partInfo['pt_pm_code'] || partInfo['pm_code'] || '') : '',
          bom_code: isGraphicsPart ? String(partInfo['pt_bom_code'] || partInfo['bom_code'] || '') : '',
          buyer: isGraphicsPart ? String(partInfo['pt_buyer'] || partInfo['buyer'] || '') : '',
          revision: isGraphicsPart ? String(partInfo['revision'] || '') : '',
          qty_needed: openQuantity,
          qty_per: 1,
          bom_level: 0,
          bom_level_hierarchical: 'Parent',
          is_parent_part: true,
          has_components: soIsParent,
          parent_component: 'SO Part',
          bom_path: soPartNumber,
          debug_source: `SO_PART_DIRECT_${isGraphicsPart ? 'GRAPHICS' : 'NON_GRAPHICS'}`,
          id: `${soPart['sales_order']}-${soPart['line_number']}-${soPartNumber}`,
          unique_id_legacy: `${soPart['sales_order']}-${soPart['line_number']}-${soPartNumber}-SO`,
          details: partInfo,
        });
      }

      const bomStartParts = [soPartNumber];
      const bomCode = String((routingInfo[soPartNumber] || {})['bom_code'] || '');
      if (bomCode && bomCode !== soPartNumber) {
        bomStartParts.push(bomCode);
      }

      let allBomComponents: Array<Record<string, unknown>> = [];
      for (const bomStartPart of bomStartParts) {
        const bomComponents = this.getBomComponentsForPart(bomStartPart, allBomData, maxBomLevels, 1, 1, []);
        if (bomComponents.length) {
          allBomComponents = bomComponents;
          break;
        }
      }

      for (const bomComponent of allBomComponents) {
        const componentLevel = Number(bomComponent['level'] || 0);
        if (showOnlyLevel !== null && componentLevel !== showOnlyLevel) {
          continue;
        }

        const componentPart = String(bomComponent['component_part'] || '');
        const componentData = allPartsLookup.get(componentPart) || {};
        const isGraphicsComponent = String(componentData['product_line'] || '') === '014';
        if (showOnlyGraphics && !isGraphicsComponent) {
          continue;
        }

        const qtyNeeded = openQuantity * Number(bomComponent['cumulative_qty'] || 0);
        const details = {
          ...componentData,
          bom_reference: bomComponent['bom_reference'] || '',
          bom_operation: bomComponent['bom_operation'] || '',
          bom_mandatory: bomComponent['bom_mandatory'] || '',
          bom_remarks: bomComponent['bom_remarks'] || '',
          bom_start_date: bomComponent['bom_start_date'] || '',
          bom_end_date: bomComponent['bom_end_date'] || '',
          bom_last_user: bomComponent['bom_last_user'] || '',
          bom_mod_date: bomComponent['bom_mod_date'] || '',
        };

        result.push({
          sales_order: soPart['sales_order'],
          line_number: soPart['line_number'],
          so_part: soPartNumber,
          due_date: soPart['due_date'],
          open_quantity: openQuantity,
          item_part: componentPart,
          item_description: String(componentData['description'] || ''),
          item_status: String(componentData['status'] || ''),
          graphics_part: isGraphicsComponent ? componentPart : null,
          graphics_description: isGraphicsComponent ? String(componentData['description'] || '') : '',
          graphics_description2: isGraphicsComponent ? String(componentData['description2'] || '') : '',
          part_type: isGraphicsComponent ? String(componentData['part_type'] || '') : '',
          status: isGraphicsComponent ? String(componentData['status'] || '') : '',
          pm_code: isGraphicsComponent ? String(componentData['pt_pm_code'] || componentData['pm_code'] || '') : '',
          bom_code: isGraphicsComponent ? String(componentData['pt_bom_code'] || componentData['bom_code'] || '') : '',
          buyer: isGraphicsComponent ? String(componentData['pt_buyer'] || componentData['buyer'] || '') : '',
          revision: isGraphicsComponent ? String(componentData['revision'] || '') : '',
          qty_needed: qtyNeeded,
          qty_per: Number(bomComponent['qty_per'] || 0),
          bom_level: componentLevel,
          bom_level_hierarchical: bomComponent['bom_level_hierarchical'],
          is_parent_part: false,
          has_components: Boolean(bomComponent['is_also_parent']),
          parent_component: bomComponent['parent_component'],
          bom_path: bomComponent['bom_path'],
          path_depth: bomComponent['path_depth'],
          bom_reference: bomComponent['bom_reference'] || '',
          bom_operation: bomComponent['bom_operation'] || '',
          bom_mandatory: bomComponent['bom_mandatory'] || '',
          bom_remarks: bomComponent['bom_remarks'] || '',
          debug_source: `BOM_COMPONENT_LEVEL_${componentLevel}_${isGraphicsComponent ? 'GRAPHICS' : 'NON_GRAPHICS'}`,
          details,
          id: `${soPart['sales_order']}-${soPart['line_number']}-${bomComponent['bom_path']}`,
          unique_id_legacy: `${soPart['sales_order']}-${soPart['line_number']}-${componentPart}-${bomComponent['parent_component']}`,
        });
      }
    }

    return this.integrateBomStatusInfo(result);
  }

  private async getBomAndPartInfoByPart(
    partNumber: string,
    maxBomLevels: number,
    showOnlyGraphics: boolean,
  ): Promise<Array<Record<string, unknown>>> {
    const partRoutingInfo = await this.getBomPartRoutingInfo([partNumber]);
    const bomCode = String((partRoutingInfo[partNumber] || {})['bom_code'] || '');
    const bomStartPart = bomCode && bomCode !== partNumber ? bomCode : partNumber;

    const allBomData: Array<Record<string, unknown>> = [];
    const processedParts = new Set<string>();
    let currentLevelParts = [bomStartPart];

    for (let level = 1; level <= maxBomLevels; level += 1) {
      const pendingParts = currentLevelParts.filter((part) => !processedParts.has(part));
      if (!pendingParts.length) {
        break;
      }

      const levelBomData = await this.getBomHierarchyForMultipleParts(pendingParts);
      if (!levelBomData.length) {
        break;
      }

      pendingParts.forEach((part) => processedParts.add(part));
      allBomData.push(...levelBomData);
      currentLevelParts = Array.from(new Set(levelBomData.map((row) => String(row['component_part'] || '')).filter(Boolean)));
    }

    const allParts = Array.from(
      new Set([partNumber, bomStartPart, ...allBomData.map((row) => String(row['component_part'] || '')).filter(Boolean)]),
    );
    const allPartsLookup = await this.getAllPartsLookup(allParts);

    const result: Array<Record<string, unknown>> = [];
    const rootPartData = allPartsLookup.get(partNumber) || {};
    const isGraphicsPart = String(rootPartData['product_line'] || '') === '014';

    if (!showOnlyGraphics || isGraphicsPart) {
      result.push({
        so_part: partNumber,
        item_part: partNumber,
        item_description: String(rootPartData['description'] || ''),
        item_status: String(rootPartData['status'] || ''),
        graphics_part: isGraphicsPart ? partNumber : null,
        graphics_description: isGraphicsPart ? String(rootPartData['description'] || '') : '',
        graphics_description2: isGraphicsPart ? String(rootPartData['description2'] || '') : '',
        part_type: isGraphicsPart ? String(rootPartData['part_type'] || '') : '',
        status: isGraphicsPart ? String(rootPartData['status'] || '') : '',
        pm_code: isGraphicsPart ? String(rootPartData['pt_pm_code'] || rootPartData['pm_code'] || '') : '',
        bom_code: isGraphicsPart ? String(rootPartData['pt_bom_code'] || rootPartData['bom_code'] || '') : '',
        buyer: isGraphicsPart ? String(rootPartData['pt_buyer'] || rootPartData['buyer'] || '') : '',
        revision: isGraphicsPart ? String(rootPartData['revision'] || '') : '',
        qty_needed: 1,
        qty_per: 1,
        bom_level: 0,
        bom_level_hierarchical: 'Parent',
        is_parent_part: true,
        has_components: allBomData.length > 0,
        parent_component: 'SO Part',
        bom_path: partNumber,
        debug_source: `PART_SEARCH_ROOT_${isGraphicsPart ? 'GRAPHICS' : 'NON_GRAPHICS'}`,
        details: rootPartData,
      });
    }

    const allBomComponents = this.getBomComponentsForPart(bomStartPart, allBomData, maxBomLevels, 1, 1, []);
    for (const bomComponent of allBomComponents) {
      const componentPart = String(bomComponent['component_part'] || '');
      const componentData = allPartsLookup.get(componentPart) || {};
      const isGraphicsComponent = String(componentData['product_line'] || '') === '014';
      if (showOnlyGraphics && !isGraphicsComponent) {
        continue;
      }

      result.push({
        so_part: partNumber,
        item_part: componentPart,
        item_description: String(componentData['description'] || ''),
        item_status: String(componentData['status'] || ''),
        graphics_part: isGraphicsComponent ? componentPart : null,
        graphics_description: isGraphicsComponent ? String(componentData['description'] || '') : '',
        graphics_description2: isGraphicsComponent ? String(componentData['description2'] || '') : '',
        part_type: isGraphicsComponent ? String(componentData['part_type'] || '') : '',
        status: isGraphicsComponent ? String(componentData['status'] || '') : '',
        pm_code: isGraphicsComponent ? String(componentData['pt_pm_code'] || componentData['pm_code'] || '') : '',
        bom_code: isGraphicsComponent ? String(componentData['pt_bom_code'] || componentData['bom_code'] || '') : '',
        buyer: isGraphicsComponent ? String(componentData['pt_buyer'] || componentData['buyer'] || '') : '',
        revision: isGraphicsComponent ? String(componentData['revision'] || '') : '',
        qty_needed: Number(bomComponent['cumulative_qty'] || 0),
        qty_per: Number(bomComponent['qty_per'] || 0),
        bom_level: Number(bomComponent['level'] || 0),
        bom_level_hierarchical: bomComponent['bom_level_hierarchical'],
        is_parent_part: false,
        has_components: Boolean(bomComponent['is_also_parent']),
        parent_component: bomComponent['parent_component'],
        bom_path: bomComponent['bom_path'],
        path_depth: bomComponent['path_depth'],
        bom_reference: bomComponent['bom_reference'] || '',
        bom_operation: bomComponent['bom_operation'] || '',
        bom_mandatory: bomComponent['bom_mandatory'] || '',
        bom_remarks: bomComponent['bom_remarks'] || '',
        debug_source: `PART_SEARCH_BOM_${isGraphicsComponent ? 'GRAPHICS' : 'NON_GRAPHICS'}`,
        details: {
          ...componentData,
          ...bomComponent,
        },
        id: `${partNumber}-${componentPart}`,
        unique_id_legacy: `${partNumber}-${bomComponent['parent_component']}-${componentPart}`,
      });
    }

    return result;
  }

  private async integrateBomStatusInfo(
    rows: Array<Record<string, unknown>>,
  ): Promise<Array<Record<string, unknown>>> {
    if (!rows.length) {
      return rows;
    }

    const ids = rows.map((row) => String(row['unique_id_legacy'] || '')).filter(Boolean);
    if (!ids.length) {
      return rows;
    }

    const [miscInfo, statusInfo] = await Promise.all([
      this.getMiscInfoBySalesOrderNumbers(ids),
      this.getGraphicsDemandStatusInfo(),
    ]);

    const miscMap = new Map<string, Record<string, unknown>>();
    miscInfo.forEach((row) => miscMap.set(String(row.so || ''), row));
    const statusMap = new Map<string, Record<string, unknown>>();
    statusInfo.forEach((row) => statusMap.set(String(row.uniqueId || ''), row));

    return rows.map((row) => {
      const legacyId = String(row['unique_id_legacy'] || '');
      const misc = miscMap.get(legacyId) || {};
      const status = statusMap.get(legacyId);

      const nextRow: Record<string, unknown> = {
        ...row,
        misc,
        checked: 'Not Ordered',
        graphicsStatus: '',
        graphicsWorkOrderNumber: '',
        graphicsSalesOrder: '',
        poEnteredBy: '',
        woNumber: '',
      };

      if (status) {
        nextRow['checked'] = Number(status.active || 0) === 1 ? 'Ordered' : 'Not Ordered';
        nextRow['checkedId'] = status.id;
        nextRow['poNumber'] = status.poNumber;
        nextRow['poEnteredBy'] = status.createdBy;
        nextRow['woNumber'] = status.woNumber || '';
        nextRow['graphicsStatus'] = status.graphicsStatus || '';
        nextRow['graphicsWorkOrderNumber'] = status.graphicsWorkOrderNumber || '';
        nextRow['graphicsSalesOrder'] = status.graphicsSalesOrder || '';
      }

      const details = { ...((row['details'] as Record<string, unknown>) || {}) };
      details['work_order_info'] = misc;
      details['graphics_status_info'] = {
        checked: nextRow['checked'],
        graphicsStatus: nextRow['graphicsStatus'],
        graphicsWorkOrderNumber: nextRow['graphicsWorkOrderNumber'],
        graphicsSalesOrder: nextRow['graphicsSalesOrder'],
        poEnteredBy: nextRow['poEnteredBy'],
        woNumber: nextRow['woNumber'],
      };
      nextRow['details'] = details;

      return nextRow;
    });
  }

  private async getBomSalesOrderParts(
    dateTo: string,
    salesOrderNumber?: string | null,
  ): Promise<Array<Record<string, unknown>>> {
    let sql = `
      SELECT DISTINCT
        a.sod_part AS part_number,
        a.sod_nbr AS sales_order,
        a.sod_line AS line_number,
        a.sod_qty_ord - a.sod_qty_ship AS open_quantity,
        a.sod_due_date AS due_date
      FROM sod_det a
      LEFT JOIN so_mstr b ON b.so_nbr = a.sod_nbr AND b.so_domain = 'EYE'
      WHERE a.sod_domain = 'EYE'
        AND a.sod_qty_ord != a.sod_qty_ship
        AND a.sod_due_date <= ?
        AND b.so_compl_date IS NULL
    `;

    const params: string[] = [dateTo];
    if (salesOrderNumber) {
      sql += ` AND a.sod_nbr = ?`;
      params.push(salesOrderNumber);
    }

    sql += ` ORDER BY a.sod_due_date ASC WITH (NOLOCK)`;

    return this.qadOdbcService.queryWithParams<Array<Record<string, unknown>>>(sql, params, {
      keyCase: 'lower',
    });
  }

  private async getBomHierarchyForMultipleParts(
    partNumbers: string[],
  ): Promise<Array<Record<string, unknown>>> {
    if (!partNumbers.length) {
      return [];
    }

    const placeholders = partNumbers.map(() => '?').join(', ');
    const sql = `
      SELECT
        ps_par AS parent_part,
        ps_comp AS component_part,
        ps_qty_per AS quantity_per,
        ps_end AS end_date,
        ps_start AS start_date,
        SUBSTRING(ps_ref, 1, 50) AS reference,
        ps_scrp_pct AS scrap_percent,
        ps_op AS operation,
        ps_item_no AS item_number,
        ps_mandatory AS mandatory,
        ps_exclusive AS exclusive_flag,
        SUBSTRING(ps_rmks, 1, 100) AS remarks,
        ps_fcst_pct AS forecast_percent,
        ps_default AS default_flag,
        ps_group AS group_code,
        ps_critical AS critical,
        ps_userid AS last_user,
        ps_mod_date AS mod_date,
        ps_start_ecn AS start_ecn,
        ps_end_ecn AS end_ecn,
        ps_comp_um AS component_um,
        ps_um_conv AS um_conversion
      FROM ps_mstr
      WHERE ps_domain = 'EYE'
        AND ps_par IN (${placeholders})
        AND ps_end IS NULL
      ORDER BY ps_par, ps_comp
      WITH (NOLOCK)
    `;

    return this.qadOdbcService.queryWithParams<Array<Record<string, unknown>>>(sql, partNumbers, {
      keyCase: 'lower',
    });
  }

  private async getBomPartRoutingInfo(
    partNumbers: string[],
  ): Promise<Record<string, Record<string, unknown>>> {
    const rows = await this.getAllPartsInfo(partNumbers);
    const lookup: Record<string, Record<string, unknown>> = {};
    rows.forEach((row) => {
      lookup[String(row['part_number'] || '')] = row;
    });
    return lookup;
  }

  private async getAllPartsLookup(
    partNumbers: string[],
  ): Promise<Map<string, Record<string, unknown>>> {
    const rows = await this.getAllPartsInfo(partNumbers);
    const lookup = new Map<string, Record<string, unknown>>();
    rows.forEach((row) => lookup.set(String(row['part_number'] || ''), row));
    return lookup;
  }

  private async getAllPartsInfo(
    partNumbers: string[],
  ): Promise<Array<Record<string, unknown>>> {
    if (!partNumbers.length) {
      return [];
    }

    const placeholders = partNumbers.map(() => '?').join(', ');
    const sql = `
      SELECT
        pt_part AS part_number,
        pt_desc1 AS description,
        pt_desc2 AS description2,
        pt_um,
        pt_draw,
        pt_prod_line AS product_line,
        pt_part_type AS part_type,
        pt_status AS status,
        pt_abc,
        pt_iss_pol,
        pt_phantom,
        pt_buyer,
        pt_vend,
        pt_pm_code,
        pt_price,
        pt_routing,
        pt_bom_code,
        pt_rev AS revision,
        pt_userid AS last_user,
        pt_mod_date AS date_modified
      FROM pt_mstr
      WHERE pt_domain = 'EYE'
        AND pt_part IN (${placeholders})
      WITH (NOLOCK)
    `;

    return this.qadOdbcService.queryWithParams<Array<Record<string, unknown>>>(sql, partNumbers, {
      keyCase: 'lower',
    });
  }

  private getBomComponentsForPart(
    partNumber: string,
    allBomData: Array<Record<string, unknown>>,
    maxLevels: number,
    currentLevel = 1,
    cumulativeQty = 1,
    path: string[] = [],
  ): Array<Record<string, unknown>> {
    const components: Array<Record<string, unknown>> = [];

    if (currentLevel > maxLevels || path.includes(partNumber)) {
      return components;
    }

    const nextPath = [...path, partNumber];

    for (const bomItem of allBomData) {
      if (String(bomItem['parent_part'] || '') !== partNumber) {
        continue;
      }

      const componentPart = String(bomItem['component_part'] || '');
      if (nextPath.includes(componentPart)) {
        continue;
      }

      const componentQty = Number(bomItem['quantity_per'] || 0);
      const totalQty = cumulativeQty * componentQty;
      const bomPath = [...nextPath, componentPart].join(' > ');
      const isAlsoParent = this.isComponentAlsoParent(componentPart, allBomData);

      const component: Record<string, unknown> = {
        component_part: componentPart,
        parent_component: String(bomItem['parent_part'] || ''),
        qty_per: componentQty,
        cumulative_qty: totalQty,
        level: currentLevel,
        bom_level_hierarchical: `${'.'.repeat(currentLevel)}${currentLevel}`,
        is_also_parent: isAlsoParent,
        bom_path: bomPath,
        bom_reference: bomItem['reference'] || '',
        bom_operation: bomItem['operation'] || '',
        bom_mandatory: bomItem['mandatory'] || '',
        bom_remarks: bomItem['remarks'] || '',
        bom_start_date: bomItem['start_date'] || '',
        bom_end_date: bomItem['end_date'] || '',
        bom_last_user: bomItem['last_user'] || '',
        bom_mod_date: bomItem['mod_date'] || '',
        path_depth: nextPath.length + 1,
      };

      components.push(component);
      components.push(
        ...this.getBomComponentsForPart(componentPart, allBomData, maxLevels, currentLevel + 1, totalQty, nextPath),
      );
    }

    return components;
  }

  private isComponentAlsoParent(
    componentPart: string,
    allBomData: Array<Record<string, unknown>>,
  ): boolean {
    return allBomData.some((row) => String(row['parent_part'] || '') === componentPart);
  }

  private buildBomTree(flatRows: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
    type BomTreeNode = {
      [key: string]: unknown;
      children: BomTreeNode[];
      _idx: number;
    };

    const nodes: BomTreeNode[] = flatRows.map((row, index) => ({
      ...row,
      children: [],
      _idx: index,
    }));
    const tree: BomTreeNode[] = [];

    for (const node of nodes) {
      const parent = String(node['parent_component'] || '');
      if (!parent || parent === 'SO Part') {
        tree.push(node);
        continue;
      }

      let attached = false;
      for (const candidate of nodes) {
        if (
          String(candidate['item_part'] || '') === parent
          && String(candidate['sales_order'] || '') === String(node['sales_order'] || '')
          && String(candidate['line_number'] || '') === String(node['line_number'] || '')
        ) {
          candidate.children.push(node);
          attached = true;
          break;
        }
      }

      if (!attached) {
        tree.push(node);
      }
    }

    const stripHelper = (items: BomTreeNode[]): Array<Record<string, unknown>> => {
      return items.map((item) => ({
        ...item,
        children: stripHelper(item.children || []),
        _idx: undefined,
      }));
    };

    return stripHelper(tree).map((item) => {
      delete item['_idx'];
      return item;
    });
  }

  private addDays(dateText: string, days: number): string {
    const date = new Date(`${dateText}T00:00:00`);
    date.setDate(date.getDate() + days);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate(),
    ).padStart(2, '0')}`;
  }

  private todayDate(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate(),
    ).padStart(2, '0')}`;
  }

  private nowDateTime(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate(),
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes(),
    ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  }

  private async ensureIgnoredFromPlanningColumn(): Promise<void> {
    if (!this.ignoreColumnReady) {
      this.ignoreColumnReady = this.ensureIgnoredFromPlanningColumnInternal();
    }

    return this.ignoreColumnReady;
  }

  private async ensureIgnoredFromPlanningColumnInternal(): Promise<void> {
    const existing = await this.mysqlService.query<RowDataPacket[]>(`
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = 'eyefidb'
        AND TABLE_NAME = 'graphicsDemand'
        AND COLUMN_NAME = 'ignoredFromPlanning'
      LIMIT 1
    `);

    if (existing.length) {
      return;
    }

    await this.mysqlService.execute<ResultSetHeader>(`
      ALTER TABLE eyefidb.graphicsDemand
      ADD COLUMN ignoredFromPlanning TINYINT(1) NOT NULL DEFAULT 0
    `);
  }
}
