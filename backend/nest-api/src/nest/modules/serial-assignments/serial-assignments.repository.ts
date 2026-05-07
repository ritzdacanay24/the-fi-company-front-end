import { Inject, Injectable } from '@nestjs/common';
import { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { BaseRepository } from '@/shared/repositories/base.repository';
import { AssignmentsFilterDto } from './dto';

const VIEW = 'eyefidb.vw_all_consumed_serials';
const TABLE = 'serial_assignments';
const AUDIT_TABLE = 'serial_assignment_audit';
const OTHER_CUSTOMER_TYPE_ID = 4;
const IGT_CUSTOMER_TYPE_ID = 1;

@Injectable()
export class SerialAssignmentsRepository extends BaseRepository<RowDataPacket> {
  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super(TABLE, mysqlService);
  }

  async bulkCreateOther(
    assignments: Array<Record<string, unknown>>,
    performedBy: string,
  ): Promise<{ data: RowDataPacket[]; count: number }> {
    const normalizedPerformedBy = String(performedBy ?? '').trim();
    if (!normalizedPerformedBy) {
      throw new Error('performedBy is required');
    }
    const batchId = `OTHER-${Date.now()}`;
    const results: RowDataPacket[] = [];

    for (const rawAssignment of assignments) {
      const created = await this.mysqlService.withTransaction(async (conn: PoolConnection) => {
        const eyefiSerialNumber = String(rawAssignment.eyefi_serial_number ?? '').trim();

        if (!eyefiSerialNumber) {
          throw new Error('EyeFi serial number is required');
        }

        const [serialRows] = await conn.execute<RowDataPacket[]>(
          `SELECT id, serial_number, status, is_consumed
           FROM eyefi_serial_numbers
           WHERE serial_number = ?
           LIMIT 1
           FOR UPDATE`,
          [eyefiSerialNumber],
        );

        const serial = serialRows[0];
        if (!serial) {
          throw new Error(`EyeFi serial '${eyefiSerialNumber}' not found`);
        }

        const [existingRows] = await conn.execute<RowDataPacket[]>(
          `SELECT id
           FROM serial_assignments
           WHERE eyefi_serial_id = ?
             AND COALESCE(is_voided, 0) = 0
           LIMIT 1`,
          [serial['id']],
        );

        if (existingRows.length > 0) {
          throw new Error(`EyeFi serial '${eyefiSerialNumber}' is already assigned`);
        }

        const ulLabelIdRaw = rawAssignment.ul_label_id;
        const ulLabelId = ulLabelIdRaw == null || ulLabelIdRaw === '' ? null : Number(ulLabelIdRaw);
        const requestedUlNumber = String(rawAssignment.ulNumber ?? '').trim() || null;
        const requestedUlCategoryRaw = String(rawAssignment.ul_category ?? '').trim();
        const requestedUlCategory = requestedUlCategoryRaw ? requestedUlCategoryRaw.toLowerCase() : null;

        if (!requestedUlCategory) {
          throw new Error('ul_category is required for UL selection');
        }

        let ulLabel: RowDataPacket | undefined;

        if (ulLabelId != null || requestedUlNumber) {
          // Use the specific UL label the user selected
          const [ulRows] = await conn.execute<RowDataPacket[]>(
            `SELECT ul.id, ul.ul_number
             FROM ul_labels ul
             LEFT JOIN serial_assignments sa
               ON sa.ul_label_id = ul.id
              AND COALESCE(sa.is_voided, 0) = 0
             WHERE ul.status = 'active'
               AND COALESCE(ul.is_consumed, 0) = 0
               AND sa.id IS NULL
               AND (? IS NULL OR LOWER(COALESCE(ul.category, '')) = ?)
               AND ((? IS NOT NULL AND ul.id = ?) OR (? IS NULL AND ? IS NOT NULL AND ul.ul_number = ?))
             LIMIT 1
             FOR UPDATE`,
            [requestedUlCategory, requestedUlCategory, ulLabelId, ulLabelId, ulLabelId, requestedUlNumber, requestedUlNumber],
          );
          ulLabel = ulRows[0];
          if (!ulLabel) {
            throw new Error(`Selected UL label is not available for assignment`);
          }
        } else {
          throw new Error('A UL label must be selected for Other customer assignments');
        }

        const woNumber = String(rawAssignment.wo_number ?? '').trim() || null;
        const customerPo = String(rawAssignment.poNumber ?? '').trim() || null;
        const customerName = String(rawAssignment.customer_name ?? '').trim();
        if (!customerName) {
          throw new Error('customer_name is required');
        }
        const woPart = String(rawAssignment.wo_part || '').trim() || null;
        const partNumber = String(rawAssignment.partNumber ?? '').trim() || null;
        const woDescription = String(rawAssignment.wo_description || '').trim() || null;
        const woRouting = String(rawAssignment.wo_routing || '').trim() || null;
        const woLine = String(rawAssignment.wo_line || '').trim() || null;
        const customerPartNumber = String(rawAssignment.cp_cust_part || '').trim() || null;
        const notes = String(rawAssignment.notes || '').trim() || null;
        const inspectorName = String(rawAssignment.inspector_name ?? '').trim();
        if (!inspectorName) {
          throw new Error('inspector_name is required');
        }
        const woQtyOrdRaw = rawAssignment.wo_qty_ord;
        const woQtyOrd = woQtyOrdRaw == null || woQtyOrdRaw === '' ? null : Number(woQtyOrdRaw);
        const woDueDate = String(rawAssignment.wo_due_date || '').trim() || null;

        const [insertResult] = await conn.execute<ResultSetHeader>(
          `INSERT INTO serial_assignments (
             eyefi_serial_id,
             eyefi_serial_number,
             ul_label_id,
             ul_number,
             customer_type_id,
             customer_asset_id,
             generated_asset_number,
             po_number,
             part_number,
             wo_number,
             wo_part,
             wo_description,
             wo_qty_ord,
             wo_due_date,
             wo_routing,
             wo_line,
             cp_cust_part,
             cp_cust,
             inspector_name,
             batch_id,
             status,
             consumed_at,
             consumed_by,
             is_voided,
             verification_status,
             notes,
             asset_type
           ) VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'consumed', NOW(), ?, 0, 'skipped', ?, 'serial')`,
          [
            Number(serial['id']),
            String(serial['serial_number']),
            Number(ulLabel['id']),
            String(ulLabel['ul_number']),
            OTHER_CUSTOMER_TYPE_ID,
            customerPo,
            partNumber,
            woNumber,
            woPart,
            woDescription,
            Number.isFinite(woQtyOrd) ? woQtyOrd : null,
            woDueDate,
            woRouting,
            woLine,
            customerPartNumber,
            customerName,
            inspectorName,
            batchId,
            String(rawAssignment.consumed_by ?? '').trim() || normalizedPerformedBy,
            notes,
          ],
        );

        await conn.execute(
          `UPDATE eyefi_serial_numbers
           SET status = 'assigned',
               is_consumed = 1,
               consumed_at = NOW(),
               consumed_by = ?
           WHERE id = ?`,
          [String(rawAssignment.consumed_by ?? '').trim() || normalizedPerformedBy, Number(serial['id'])],
        );

        await conn.execute(
          `UPDATE ul_labels
           SET is_consumed = 1,
               consumed_at = NOW(),
               consumed_by = ?
           WHERE id = ?`,
          [String(rawAssignment.consumed_by ?? '').trim() || normalizedPerformedBy, Number(ulLabel['id'])],
        );

        await conn.execute(
          `INSERT INTO \`${AUDIT_TABLE}\` (assignment_id, action, serial_type, serial_id, serial_number, reason, performed_by, performed_at)
           VALUES (?, 'created', 'eyefi', ?, ?, 'Created from serial assignment workflow', ?, NOW())`,

          [insertResult.insertId, Number(serial['id']), String(serial['serial_number']), String(rawAssignment.consumed_by ?? '').trim() || normalizedPerformedBy],
        );

        return {
          id: insertResult.insertId,
          eyefi_serial_number: String(serial['serial_number']),
          ul_label_id: Number(ulLabel['id']),
          ul_number: String(ulLabel['ul_number']),
          customer_name: customerName,
          wo_number: woNumber,
          consumed_by: String(rawAssignment.consumed_by ?? '').trim() || normalizedPerformedBy,
          batch_id: batchId,
        } as RowDataPacket;
      });

      results.push(created);
    }

    return { data: results, count: results.length };
  }

  async bulkCreateIgtWorkflow(
    assignments: Array<Record<string, unknown>>,
    performedBy: string,
  ): Promise<{ data: RowDataPacket[]; count: number; missingIgt: string[] }> {
    const normalizedPerformedBy = String(performedBy ?? '').trim();
    if (!normalizedPerformedBy) {
      throw new Error('performedBy is required');
    }
    const results: RowDataPacket[] = [];
    const missingIgt: string[] = [];

    for (const rawAssignment of assignments) {
      const created = await this.mysqlService.withTransaction(async (conn: PoolConnection) => {
        const eyefiSerialNumber = String(rawAssignment.eyefi_serial_number ?? '').trim();

        if (!eyefiSerialNumber) {
          throw new Error('EyeFi serial number is required for IGT workflow');
        }

        const [serialRows] = await conn.execute<RowDataPacket[]>(
          `SELECT id, serial_number, status, is_consumed
           FROM eyefi_serial_numbers
           WHERE serial_number = ?
           LIMIT 1
           FOR UPDATE`,
          [eyefiSerialNumber],
        );

        const serial = serialRows[0];
        if (!serial) {
          throw new Error(`EyeFi serial '${eyefiSerialNumber}' not found`);
        }

        const [existingRows] = await conn.execute<RowDataPacket[]>(
          `SELECT id
           FROM serial_assignments
           WHERE eyefi_serial_id = ?
             AND COALESCE(is_voided, 0) = 0
           LIMIT 1
           FOR UPDATE`,
          [serial['id']],
        );

        if (existingRows.length > 0) {
          throw new Error(`EyeFi serial '${eyefiSerialNumber}' is already assigned`);
        }

        const requestedIgtIdRaw = rawAssignment.igt_asset_id;
        const requestedIgtId = requestedIgtIdRaw == null || requestedIgtIdRaw === ''
          ? null
          : Number(requestedIgtIdRaw);
        const requestedIgtSerial = String(rawAssignment.igt_serial_number ?? '').trim();

        if (!(requestedIgtId != null && Number.isFinite(requestedIgtId) && requestedIgtId > 0) && !requestedIgtSerial) {
          throw new Error('Either igt_asset_id or igt_serial_number is required');
        }

        let igtRows: RowDataPacket[] = [];

        if (requestedIgtId != null && Number.isFinite(requestedIgtId) && requestedIgtId > 0) {
          [igtRows] = await conn.execute<RowDataPacket[]>(
            `SELECT id, serial_number, status
             FROM igt_serial_numbers
             WHERE id = ?
             LIMIT 1
             FOR UPDATE`,
            [requestedIgtId],
          );
        }

        if (!igtRows[0] && requestedIgtSerial) {
          [igtRows] = await conn.execute<RowDataPacket[]>(
            `SELECT id, serial_number, status
             FROM igt_serial_numbers
             WHERE serial_number = ?
             LIMIT 1
             FOR UPDATE`,
            [requestedIgtSerial],
          );
        }

        const igtAsset = igtRows[0];
        if (!igtAsset) {
          missingIgt.push(requestedIgtSerial || `igt_asset_id:${String(requestedIgtIdRaw ?? '')}`);
          throw new Error('IGT serial not found for assignment');
        }

        const ulLabelIdRaw = rawAssignment.ul_label_id;
        const ulLabelId = ulLabelIdRaw == null || ulLabelIdRaw === '' ? null : Number(ulLabelIdRaw);
        const requestedUlNumber = String(rawAssignment.ulNumber ?? '').trim() || null;
        const requestedUlCategoryRaw = String(rawAssignment.ul_category ?? '').trim();
        const requestedUlCategory = requestedUlCategoryRaw ? requestedUlCategoryRaw.toLowerCase() : null;

        if (ulLabelId != null || requestedUlNumber) {
          if (!requestedUlCategory) {
            throw new Error('ul_category is required for UL selection');
          }
        }

        let ulLabel: RowDataPacket | null = null;
        if (ulLabelId != null || requestedUlNumber) {
          const [ulRows] = await conn.execute<RowDataPacket[]>(
            `SELECT ul.id, ul.ul_number
             FROM ul_labels ul
             LEFT JOIN serial_assignments sa
               ON sa.ul_label_id = ul.id
              AND COALESCE(sa.is_voided, 0) = 0
             WHERE ul.status = 'active'
               AND COALESCE(ul.is_consumed, 0) = 0
               AND sa.id IS NULL
               AND (? IS NULL OR LOWER(COALESCE(ul.category, '')) = ?)
               AND ((? IS NOT NULL AND ul.id = ?) OR (? IS NULL AND ? IS NOT NULL AND ul.ul_number = ?))
             LIMIT 1
             FOR UPDATE`,
            [requestedUlCategory, requestedUlCategory, ulLabelId, ulLabelId, ulLabelId, requestedUlNumber, requestedUlNumber],
          );

          ulLabel = ulRows[0] || null;
          if (!ulLabel) {
            throw new Error('Selected UL label is not available for assignment');
          }
        }

        const poNumber = String(rawAssignment.poNumber ?? '').trim() || null;
        const partNumber = String(rawAssignment.partNumber ?? '').trim() || null;
        const woNumber = String(rawAssignment.wo_number ?? '').trim() || null;
        const woPart = String(rawAssignment.wo_part || '').trim() || null;
        const woDescription = String(rawAssignment.wo_description || '').trim() || null;
        const woRouting = String(rawAssignment.wo_routing || '').trim() || null;
        const woLine = String(rawAssignment.wo_line || '').trim() || null;
        const cpCustPart = String(rawAssignment.cp_cust_part || '').trim() || null;
        const cpCust = String(rawAssignment.cp_cust || '').trim() || null;
        const inspectorName = String(rawAssignment.inspector_name ?? '').trim();
        const consumedBy = String(rawAssignment.consumed_by ?? '').trim();
        if (!inspectorName) {
          throw new Error('inspector_name is required');
        }
        if (!consumedBy) {
          throw new Error('consumed_by is required');
        }
        const woQtyOrdRaw = rawAssignment.wo_qty_ord;
        const woQtyOrd = woQtyOrdRaw == null || woQtyOrdRaw === '' ? null : Number(woQtyOrdRaw);
        const woDueDate = String(rawAssignment.wo_due_date || '').trim() || null;
        const propertySite = String(rawAssignment.property_site || '').trim() || null;
        const notes = String(rawAssignment.notes || '').trim() || null;
        const assetType = String(rawAssignment.asset_type ?? '').trim();
        if (!assetType) {
          throw new Error('asset_type is required');
        }

        const [insertResult] = await conn.execute<ResultSetHeader>(
          `INSERT INTO serial_assignments (
             eyefi_serial_id,
             eyefi_serial_number,
             ul_label_id,
             ul_number,
             customer_type_id,
             customer_asset_id,
             generated_asset_number,
             po_number,
             property_site,
             part_number,
             wo_number,
             wo_part,
             wo_description,
             wo_qty_ord,
             wo_due_date,
             wo_routing,
             wo_line,
             cp_cust_part,
             cp_cust,
             inspector_name,
             batch_id,
             status,
             consumed_at,
             consumed_by,
             is_voided,
             verification_status,
             notes,
             asset_type
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'consumed', NOW(), ?, 0, 'pending', ?, ?)` ,
          [
            Number(serial['id']),
            String(serial['serial_number']),
            ulLabel ? Number(ulLabel['id']) : null,
            ulLabel ? String(ulLabel['ul_number']) : null,
            IGT_CUSTOMER_TYPE_ID,
            Number(igtAsset['id']),
            String(igtAsset['serial_number']),
            poNumber,
            propertySite,
            partNumber,
            woNumber,
            woPart,
            woDescription,
            Number.isFinite(woQtyOrd) ? woQtyOrd : null,
            woDueDate,
            woRouting,
            woLine,
            cpCustPart,
            cpCust,
            inspectorName,
            consumedBy,
            notes,
            assetType,
          ],
        );

        await conn.execute(
          `UPDATE eyefi_serial_numbers
           SET status = 'assigned',
               is_consumed = 1,
               consumed_at = NOW(),
               consumed_by = ?
           WHERE id = ?`,
          [consumedBy, Number(serial['id'])],
        );

        if (ulLabel) {
          await conn.execute(
            `UPDATE ul_labels
             SET is_consumed = 1,
                 consumed_at = NOW(),
                 consumed_by = ?
             WHERE id = ?`,
            [consumedBy, Number(ulLabel['id'])],
          );
        }

        await conn.execute(
          `UPDATE igt_serial_numbers
           SET status = 'used',
               used_at = NOW(),
               used_by = ?,
               updated_by = ?,
               used_in_asset_id = ?,
               used_in_asset_number = ?
           WHERE id = ?`,
          [
            consumedBy,
            consumedBy,
            insertResult.insertId,
            String(igtAsset['serial_number']),
            Number(igtAsset['id']),
          ],
        );

        await conn.execute(
          `INSERT INTO \`${AUDIT_TABLE}\` (assignment_id, action, serial_type, serial_id, serial_number, reason, performed_by, performed_at)
           VALUES (?, 'created', 'eyefi', ?, ?, 'Created from IGT serial assignment workflow', ?, NOW())`,
          [insertResult.insertId, Number(serial['id']), String(serial['serial_number']), consumedBy],
        );

        return {
          assignment_id: insertResult.insertId,
          eyefi_serial_number: String(serial['serial_number']),
          ul_label_id: ulLabel ? Number(ulLabel['id']) : null,
          ul_number: ulLabel ? String(ulLabel['ul_number']) : null,
          customer_type_id: IGT_CUSTOMER_TYPE_ID,
          customer_asset_id: Number(igtAsset['id']),
          generated_asset_number: String(igtAsset['serial_number']),
          po_number: poNumber,
          part_number: partNumber,
          inspector_name: inspectorName,
          consumed_by: consumedBy,
          status: 'consumed',
        } as RowDataPacket;
      });

      results.push(created);
    }

    return {
      data: results,
      count: results.length,
      missingIgt,
    };
  }

  async findAll(filters: AssignmentsFilterDto): Promise<{
    data: RowDataPacket[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  }> {
    const conditions: string[] = ['1=1'];
    const params: unknown[] = [];

    if (filters.wo_number) {
      conditions.push('(v.wo_number LIKE ? OR v.po_number LIKE ?)');
      params.push(`%${filters.wo_number}%`, `%${filters.wo_number}%`);
    }
    if (filters.eyefi_serial_number) {
      conditions.push('v.eyefi_serial_number LIKE ?');
      params.push(`%${filters.eyefi_serial_number}%`);
    }
    if (filters.ul_number) {
      conditions.push('v.ul_number LIKE ?');
      params.push(`%${filters.ul_number}%`);
    }
    if (filters.consumed_by) {
      conditions.push('v.used_by LIKE ?');
      params.push(`%${filters.consumed_by}%`);
    }
    if (filters.date_from) {
      conditions.push('DATE(v.used_date) >= ?');
      params.push(filters.date_from);
    }
    if (filters.date_to) {
      conditions.push('DATE(v.used_date) <= ?');
      params.push(filters.date_to);
    }
    if (filters.status) {
      conditions.push('v.status = ?');
      params.push(filters.status);
    }
    if (!filters.include_voided) {
      conditions.push('(v.is_voided = 0 OR v.is_voided IS NULL)');
    }

    const where = conditions.join(' AND ');
    const page = Math.max(1, Math.floor(filters.page ?? 1));
    const requestedLimit = filters.limit != null ? Math.floor(filters.limit) : undefined;
    const hasLimit = requestedLimit != null && requestedLimit > 0;
    const limit = hasLimit ? Math.min(500, Math.max(1, requestedLimit)) : undefined;
    const offset = hasLimit && limit != null ? (page - 1) * limit : 0;

    const data = await this.rawQuery<RowDataPacket>(
      `SELECT
         v.unique_id, v.source_table, v.source_type,
         v.source_id AS id,
         v.eyefi_serial_id, v.eyefi_serial_number,
         v.ul_label_id, v.ul_number, v.ul_category,
         v.wo_number, v.po_number, v.batch_id,
         v.used_date AS consumed_at, v.used_by AS consumed_by,
         v.status, v.created_at,
         v.is_voided, v.voided_by, v.voided_at, v.void_reason,
         v.part_number, v.wo_description,
         v.customer_part_number, v.customer_name
       FROM ${VIEW} v
       WHERE ${where}
       ORDER BY v.used_date DESC, v.unique_id DESC
       ${hasLimit && limit != null ? `LIMIT ${limit} OFFSET ${offset}` : ''}`,
      params,
    );

    const total = data.length;

    return {
      data,
      total,
      page: hasLimit ? page : 1,
      limit: hasLimit && limit != null ? limit : total,
      total_pages: hasLimit && limit != null ? Math.ceil(total / limit) : 1,
    };
  }

  async findById(id: number): Promise<RowDataPacket | null> {
    const rows = await this.rawQuery<RowDataPacket>(
      `SELECT
         sa.id, sa.eyefi_serial_id, sa.eyefi_serial_number,
         sa.ul_label_id, sa.ul_number,
         sa.wo_number, sa.po_number, sa.batch_id,
         sa.consumed_at AS used_date, sa.consumed_by AS used_by,
         sa.status, sa.created_at,
         sa.is_voided, sa.voided_by, sa.voided_at, sa.void_reason,
         sa.part_number, sa.wo_description,
         sa.wo_qty_ord AS qty_ord, sa.wo_due_date AS due_date,
         sa.wo_routing AS routing, sa.wo_line AS line,
         sa.cp_cust_part AS customer_part_number, sa.cp_cust AS customer_name,
         sa.inspector_name, sa.customer_type_id, sa.customer_asset_id,
         sa.generated_asset_number,
         sa.verification_status, sa.verification_photo, sa.verified_at, sa.verified_by,
         igt.serial_number AS igt_serial_number,
         ags.generated_SG_asset AS ags_serial_number,
         sg.generated_SG_asset AS sg_asset_number,
         ul.category AS ul_category
       FROM \`${TABLE}\` sa
       LEFT JOIN igt_serial_numbers igt ON sa.customer_type_id = 1 AND sa.customer_asset_id = igt.id
       LEFT JOIN agsSerialGenerator ags ON sa.customer_type_id = 3 AND sa.customer_asset_id = ags.id
       LEFT JOIN sgAssetGenerator sg ON sa.customer_type_id = 2 AND sa.customer_asset_id = sg.id
       LEFT JOIN ul_labels ul ON sa.ul_label_id = ul.id
       WHERE sa.id = ?
       LIMIT 1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async findByUlNumber(ulNumber: string): Promise<RowDataPacket[]> {
    return this.rawQuery<RowDataPacket>(
      `SELECT
         v.source_id AS id,
         v.source_table,
         v.source_type,
         sa.eyefi_serial_id,
         v.eyefi_serial_number,
         v.ul_label_id,
         v.ul_number,
         v.wo_number,
         v.po_number,
         v.batch_id,
         v.used_date,
         v.used_by,
         v.used_by AS consumed_by,
         v.status,
         v.created_at,
         v.is_voided,
         v.voided_by,
         v.voided_at,
         v.void_reason,
         v.part_number,
         v.wo_description,
         sa.wo_qty_ord AS qty_ordered,
         sa.wo_due_date AS due_date,
         sa.wo_routing AS routing,
         sa.wo_line AS line_number,
         v.customer_part_number,
         v.customer_name,
         COALESCE(sa.inspector_name, v.inspector_name, v.used_by) AS performed_by,
         sa.customer_type_id,
         sa.customer_asset_id,
         sa.generated_asset_number AS generated_asset_number,
         sa.verification_status,
         sa.verified_at,
         sa.verified_by,
         v.igt_serial_number,
         v.ags_serial_number,
         v.sg_asset_number,
         v.ul_category
       FROM ${VIEW} v
       LEFT JOIN \`${TABLE}\` sa
         ON v.source_table = 'serial_assignments' AND sa.id = v.source_id
       WHERE v.ul_number = ?
       ORDER BY v.used_date DESC, v.unique_id DESC`,
      [ulNumber],
    );
  }

  async findByIgtSerialNumber(igtSerialNumber: string): Promise<RowDataPacket[]> {
    return this.rawQuery<RowDataPacket>(
      `SELECT
         v.source_id AS id,
         v.source_table,
         v.source_type,
         sa.eyefi_serial_id,
         v.eyefi_serial_number,
         v.ul_label_id,
         v.ul_number,
         v.wo_number,
         v.po_number,
         v.batch_id,
         v.used_date,
         v.used_by,
         v.used_by AS consumed_by,
         v.status,
         v.created_at,
         v.is_voided,
         v.voided_by,
         v.voided_at,
         v.void_reason,
         v.part_number,
         v.wo_description,
         sa.wo_qty_ord AS qty_ordered,
         sa.wo_due_date AS due_date,
         sa.wo_routing AS routing,
         sa.wo_line AS line_number,
         v.customer_part_number,
         v.customer_name,
         COALESCE(sa.inspector_name, v.inspector_name, v.used_by) AS performed_by,
         sa.customer_type_id,
         sa.customer_asset_id,
         sa.generated_asset_number AS generated_asset_number,
         sa.verification_status,
         sa.verified_at,
         sa.verified_by,
         v.igt_serial_number,
         v.ags_serial_number,
         v.sg_asset_number,
         v.ul_category
       FROM ${VIEW} v
       LEFT JOIN \`${TABLE}\` sa
         ON v.source_table = 'serial_assignments' AND sa.id = v.source_id
       WHERE v.igt_serial_number = ?
       ORDER BY v.used_date DESC, v.unique_id DESC`,
      [igtSerialNumber],
    );
  }

  async getStatistics(): Promise<RowDataPacket | null> {
    const rows = await this.rawQuery<RowDataPacket>(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'active'    THEN 1 ELSE 0 END) AS active,
         SUM(CASE WHEN status = 'consumed'  THEN 1 ELSE 0 END) AS consumed,
         SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
         SUM(CASE WHEN status = 'returned'  THEN 1 ELSE 0 END) AS returned,
         SUM(CASE WHEN DATE(consumed_at) = CURDATE() THEN 1 ELSE 0 END) AS today,
         SUM(CASE WHEN YEARWEEK(consumed_at, 1) = YEARWEEK(CURDATE(), 1) THEN 1 ELSE 0 END) AS this_week,
         SUM(CASE WHEN is_voided = 1 THEN 1 ELSE 0 END) AS voided
       FROM \`${TABLE}\``,
    );
    return rows[0] ?? null;
  }

  async getAuditTrail(assignmentId?: number, limit = 100): Promise<RowDataPacket[]> {
    const cap = Math.min(1000, Math.max(1, Math.floor(limit)));
    if (assignmentId) {
      return this.rawQuery<RowDataPacket>(
        `SELECT id, assignment_id, action, reason, performed_by, performed_at
         FROM \`${AUDIT_TABLE}\`
         WHERE assignment_id = ?
         ORDER BY performed_at DESC`,
        [assignmentId],
      );
    }
    return this.rawQuery<RowDataPacket>(
      `SELECT id, assignment_id, action, reason, performed_by, performed_at
       FROM \`${AUDIT_TABLE}\`
       ORDER BY performed_at DESC
       LIMIT ${cap}`,
    );
  }

  async voidOne(
    id: number,
    reason: string,
    performedBy: string,
  ): Promise<{ freed_eyefi_serial: string | null; freed_ul_label: string | null }> {
    return this.mysqlService.withTransaction(async (conn: PoolConnection) => {
      const [rows] = await conn.execute<RowDataPacket[]>(
        `SELECT * FROM \`${TABLE}\` WHERE id = ? LIMIT 1`,
        [id],
      );
      const assignment = rows[0];
      if (!assignment) throw new Error('Assignment not found');
      if (assignment['is_voided']) throw new Error('Assignment is already voided');

      await conn.execute(
        `UPDATE \`${TABLE}\`
         SET is_voided = 1, voided_by = ?, voided_at = NOW(), void_reason = ?, status = 'cancelled'
         WHERE id = ?`,
        [performedBy, reason, id],
      );

      await conn.execute(
        `UPDATE eyefi_serial_numbers SET status = 'available' WHERE id = ?`,
        [assignment['eyefi_serial_id']],
      );

      if (assignment['ul_label_id']) {
        await conn.execute(
          `UPDATE ul_labels SET status = 'available', is_consumed = 0 WHERE id = ?`,
          [assignment['ul_label_id']],
        );
      }

      await conn.execute(
        `INSERT INTO \`${AUDIT_TABLE}\` (assignment_id, action, serial_type, serial_id, serial_number, reason, performed_by, performed_at)
         VALUES (?, 'voided', 'eyefi', ?, ?, ?, ?, NOW())`,
        [id, assignment['eyefi_serial_id'], assignment['eyefi_serial_number'] ?? '', reason, performedBy],
      );

      return {
        freed_eyefi_serial: (assignment['eyefi_serial_number'] as string) ?? null,
        freed_ul_label: (assignment['ul_number'] as string) ?? null,
      };
    });
  }

  async deleteOne(
    id: number,
    reason: string,
    performedBy: string,
  ): Promise<{ freed_serial: string | null; freed_ul_label: string | null }> {
    return this.mysqlService.withTransaction(async (conn: PoolConnection) => {
      const [rows] = await conn.execute<RowDataPacket[]>(
        `SELECT * FROM \`${TABLE}\` WHERE id = ? LIMIT 1`,
        [id],
      );
      const assignment = rows[0];
      if (!assignment) throw new Error('Assignment not found');

      const isAssetLinked = Boolean(
        assignment['customer_asset_id'] ||
          assignment['generated_asset_number'] ||
          assignment['part_number'] ||
          assignment['customer_type_id'],
      );
      if (isAssetLinked) {
        throw new Error('Hard delete is blocked for asset-linked assignments. Use void instead.');
      }

      await conn.execute(
        `UPDATE eyefi_serial_numbers SET status = 'available' WHERE id = ?`,
        [assignment['eyefi_serial_id']],
      );

      if (assignment['ul_label_id']) {
        await conn.execute(
          `UPDATE ul_labels SET status = 'available', is_consumed = 0 WHERE id = ?`,
          [assignment['ul_label_id']],
        );
      }

      await conn.execute(
        `INSERT INTO \`${AUDIT_TABLE}\` (assignment_id, action, serial_type, serial_id, serial_number, reason, performed_by, performed_at)
         VALUES (?, 'deleted', 'eyefi', ?, ?, ?, ?, NOW())`,
        [id, assignment['eyefi_serial_id'], assignment['eyefi_serial_number'] ?? '', reason, performedBy],
      );

      await conn.execute(`DELETE FROM \`${TABLE}\` WHERE id = ?`, [id]);

      return {
        freed_serial: (assignment['eyefi_serial_number'] as string) ?? null,
        freed_ul_label: (assignment['ul_number'] as string) ?? null,
      };
    });
  }

  async restoreOne(id: number, performedBy: string): Promise<void> {
    await this.mysqlService.withTransaction(async (conn: PoolConnection) => {
      const [rows] = await conn.execute<RowDataPacket[]>(
        `SELECT * FROM \`${TABLE}\` WHERE id = ? LIMIT 1`,
        [id],
      );
      const assignment = rows[0];
      if (!assignment) throw new Error('Assignment not found');
      if (!assignment['is_voided']) throw new Error('Assignment is not voided');

      await conn.execute(
        `UPDATE \`${TABLE}\`
         SET is_voided = 0, voided_by = NULL, voided_at = NULL, void_reason = NULL, status = 'consumed'
         WHERE id = ?`,
        [id],
      );

      await conn.execute(
        `UPDATE eyefi_serial_numbers SET status = 'assigned' WHERE id = ?`,
        [assignment['eyefi_serial_id']],
      );

      if (assignment['ul_label_id']) {
        await conn.execute(
          `UPDATE ul_labels SET is_consumed = 1 WHERE id = ?`,
          [assignment['ul_label_id']],
        );
      }

      await conn.execute(
        `INSERT INTO \`${AUDIT_TABLE}\` (assignment_id, action, serial_type, serial_id, serial_number, reason, performed_by, performed_at)
         VALUES (?, 'restored', 'eyefi', ?, ?, 'Assignment restored', ?, NOW())`,
        [id, assignment['eyefi_serial_id'], assignment['eyefi_serial_number'] ?? '', performedBy],
      );
    });
  }

  async reassignOne(
    id: number,
    newWoNumber: string,
    reason: string,
    performedBy: string,
    woDetails?: {
      wo_description?: string;
      wo_part?: string;
      wo_qty_ord?: number;
      wo_due_date?: string;
      wo_routing?: string;
      wo_line?: string;
      cp_cust_part?: string;
      cp_cust?: string;
    },
  ): Promise<{ old_wo_number: string | null; new_wo_number: string; eyefi_serial_number: string | null }> {
    const targetWo = String(newWoNumber || '').trim();
    if (!targetWo) {
      throw new Error('New work order number is required');
    }

    return this.mysqlService.withTransaction(async (conn: PoolConnection) => {
      const [rows] = await conn.execute<RowDataPacket[]>(
        `SELECT * FROM \`${TABLE}\` WHERE id = ? LIMIT 1`,
        [id],
      );

      const assignment = rows[0];
      if (!assignment) throw new Error('Assignment not found');
      if (assignment['is_voided']) throw new Error('Cannot reassign a voided assignment');

      const oldWo = (assignment['wo_number'] as string) ?? null;
      if (oldWo && String(oldWo).trim().toUpperCase() === targetWo.toUpperCase()) {
        throw new Error('Assignment is already under the target work order');
      }

      await conn.execute(
        `UPDATE \`${TABLE}\`
         SET wo_number = ?, po_number = ?,
             wo_description = COALESCE(?, wo_description),
             wo_part = COALESCE(?, wo_part),
             wo_qty_ord = COALESCE(?, wo_qty_ord),
             wo_due_date = COALESCE(?, wo_due_date),
             wo_routing = COALESCE(?, wo_routing),
             wo_line = COALESCE(?, wo_line),
             cp_cust_part = COALESCE(?, cp_cust_part),
             cp_cust = COALESCE(?, cp_cust)
         WHERE id = ?`,
        [
          targetWo, targetWo,
          woDetails?.wo_description ?? null,
          woDetails?.wo_part ?? null,
          woDetails?.wo_qty_ord ?? null,
          woDetails?.wo_due_date ?? null,
          woDetails?.wo_routing ?? null,
          woDetails?.wo_line ?? null,
          woDetails?.cp_cust_part ?? null,
          woDetails?.cp_cust ?? null,
          id,
        ],
      );

      const auditReason = `Reassigned WO ${oldWo || 'N/A'} -> ${targetWo}. ${reason}`.trim();
      await conn.execute(
        `INSERT INTO \`${AUDIT_TABLE}\` (assignment_id, action, serial_type, serial_id, serial_number, reason, performed_by, performed_at)
         VALUES (?, 'reassigned', 'eyefi', ?, ?, ?, ?, NOW())`,
        [id, assignment['eyefi_serial_id'], assignment['eyefi_serial_number'] ?? '', auditReason, performedBy],
      );

      return {
        old_wo_number: oldWo,
        new_wo_number: targetWo,
        eyefi_serial_number: (assignment['eyefi_serial_number'] as string) ?? null,
      };
    });
  }

  async bulkVoid(
    ids: number[],
    reason: string,
    performedBy: string,
  ): Promise<{ voided: number; errors: { id: number; error: string }[] }> {
    let voided = 0;
    const errors: { id: number; error: string }[] = [];

    for (const id of ids) {
      try {
        await this.voidOne(id, reason, performedBy);
        voided++;
      } catch (err) {
        errors.push({ id, error: (err as Error).message });
      }
    }

    return { voided, errors };
  }

  async getDailyConsumptionTrend(): Promise<RowDataPacket[]> {
    return this.rawQuery<RowDataPacket>(
      `SELECT DATE(used_date) AS date, COUNT(*) AS count
       FROM ${VIEW}
       WHERE used_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
       GROUP BY DATE(used_date)
       ORDER BY date ASC`,
    );
  }

  async getUserConsumptionActivity(): Promise<RowDataPacket[]> {
    return this.rawQuery<RowDataPacket>(
      `SELECT used_by, COUNT(*) AS count, MAX(used_date) AS last_activity
       FROM ${VIEW}
       WHERE used_by IS NOT NULL
       GROUP BY used_by
       ORDER BY count DESC`,
    );
  }

  async getWorkOrderSerials(workOrder?: string): Promise<RowDataPacket[]> {
    if (workOrder) {
      return this.rawQuery<RowDataPacket>(
        `SELECT *
         FROM ${VIEW}
         WHERE wo_number LIKE ? OR po_number LIKE ?
         ORDER BY used_date DESC`,
        [`%${workOrder}%`, `%${workOrder}%`],
      );
    }
    return this.rawQuery<RowDataPacket>(
      `SELECT wo_number, COUNT(*) AS serial_count, MAX(used_date) AS last_used
       FROM ${VIEW}
       WHERE wo_number IS NOT NULL
       GROUP BY wo_number
       ORDER BY last_used DESC
       LIMIT 100`,
    );
  }
}
