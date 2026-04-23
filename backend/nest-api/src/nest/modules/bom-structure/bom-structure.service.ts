import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { QadOdbcService } from '@/shared/database/qad-odbc.service';

@Injectable()
export class BomStructureService {
  constructor(
    @Inject(MysqlService) private readonly mysqlService: MysqlService,
    @Inject(QadOdbcService) private readonly qadOdbcService: QadOdbcService,
  ) {}

  async getBomStructure(query: Record<string, unknown>): Promise<unknown> {
    const daysOut = Number(query['days'] ?? 300) || 300;
    const maxBomLevels = Number(query['max_levels'] ?? 5) || 5;
    const showOnlyLevelRaw = String(query['level'] ?? '').trim();
    const showOnlyLevel = showOnlyLevelRaw === '' ? null : Number(showOnlyLevelRaw);
    const salesOrderNumber = String(query['so'] ?? '').trim().toUpperCase() || null;
    const searchPartNumber = String(query['part'] ?? '').trim().toUpperCase() || null;
    const showOnlyGraphics =
      String(query['graphics_only'] ?? '0') === '1'
      || String(query['graphics_only'] ?? '').toLowerCase() === 'true';
    const nested = String(query['nested'] ?? '0') === '1' || String(query['nested'] ?? '').toLowerCase() === 'true';

    const results = searchPartNumber
      ? await this.getBomAndPartInfoByPart(searchPartNumber, maxBomLevels, showOnlyGraphics)
      : await this.getLegacyBomStructureReport(
        daysOut,
        maxBomLevels,
        showOnlyLevel,
        salesOrderNumber,
        showOnlyGraphics,
      );

    if (!nested) {
      return results;
    }

    return this.buildBomTree(
      results.filter((row) => row['item_part'] && row['parent_component']),
    );
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

    const allSoPartNumbers = Array.from(
      new Set(salesOrderParts.map((row) => String(row['part_number'] || '')).filter(Boolean)),
    );
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
      currentLevelParts = Array.from(
        new Set(levelBomData.map((row) => String(row['component_part'] || '')).filter(Boolean)),
      );
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
        const bomComponents = this.getBomComponentsForPart(
          bomStartPart,
          allBomData,
          maxBomLevels,
          1,
          1,
          [],
        );
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
      currentLevelParts = Array.from(
        new Set(levelBomData.map((row) => String(row['component_part'] || '')).filter(Boolean)),
      );
    }

    const allParts = Array.from(
      new Set([
        partNumber,
        bomStartPart,
        ...allBomData.map((row) => String(row['component_part'] || '')).filter(Boolean),
      ]),
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

    const allBomComponents = this.getBomComponentsForPart(
      bomStartPart,
      allBomData,
      maxBomLevels,
      1,
      1,
      [],
    );

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

  private async getGraphicsDemandStatusInfo(): Promise<Array<Record<string, unknown>>> {
    const sql = `
      SELECT a.so
        , a.line
        , a.id
        , a.part
        , a.uniqueId
        , a.poNumber
        , a.active
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
        ...this.getBomComponentsForPart(
          componentPart,
          allBomData,
          maxLevels,
          currentLevel + 1,
          totalQty,
          nextPath,
        ),
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
}
