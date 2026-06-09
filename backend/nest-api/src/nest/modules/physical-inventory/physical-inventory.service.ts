import { BadRequestException, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { QadOdbcService, QadOdbcTarget } from '@/shared/database/qad-odbc.service';
import { MysqlService } from '@/shared/database/mysql.service';

export type PhysicalInventorySummary = {
  stats: {
    totalTags: number;
    completedFirstCounts: number;
    completedSecondCounts: number;
    completedThirdCounts: number;
    firstCountVariance: number;
    secondCountVariance: number;
    outstandingFirstCounts: number;
    outstandingSecondCounts: number;
    postedTags: number;
    unpostedTags: number;
    bulkTagsWithQty: number;
    totalValue: number;
    varianceValue: number;
  };
  progress: {
    firstCount: number;
    secondCount: number;
    thirdCount: number;
    posted: number;
  };
  lastUpdated: string;
  target: string;
};

@Injectable()
export class PhysicalInventoryService {
  constructor(
    private readonly qadOdbcService: QadOdbcService,
    private readonly mysqlService: MysqlService,
  ) {}

  async getInventoryTags(target?: QadOdbcTarget): Promise<Array<Record<string, unknown>>> {
    const mainSql = `
      SELECT a.tag_nbr
        , case
            when loc_type IN ('COI', 'FG', 'WH')
              THEN UPPER(CAST(SUBSTRING(LTRIM(RTRIM(a.tag_loc)), 3, 3) AS CHAR(25)))
            ELSE UPPER(CAST(SUBSTRING(a.tag_loc, 1, 3) AS CHAR(25)))
          end aisle
        , a.tag_part
        , CAST(case
            when loc_type IN ('COI', 'FG', 'WH')
              THEN UPPER(CAST(SUBSTRING(LTRIM(RTRIM(a.tag_loc)), 3, LENGTH(a.tag_loc)) AS CHAR(25)))
            ELSE UPPER(CAST(a.tag_loc AS CHAR(25)))
          end AS CHAR(25)) tag_loc
        , case
            when loc_type IN ('COI', 'FG', 'WH')
              THEN 'YES'
            ELSE 'NO'
          end is_coi
        , UPPER(CAST(a.tag_loc AS CHAR(25))) tag_loc_real
        , a.tag_serial
        , cast(a.tag_cnt_qty as numeric(36,2)) tag_cnt_qty
        , a.tag_cnt_dt
        , cast(a.tag_rcnt_qty as numeric(36,2)) tag_rcnt_qty
        , a.tag_rcnt_dt
        , a.tag_crt_dt
        , a.tag_posted
        , a.tag_serial_id
        , a.tag_crt_time
        , b.fullDesc
        , cast(c.ld_qty_oh as numeric(36,2)) ld_qty_oh
        , CASE
            WHEN d.loc_cap = 21 THEN 'LOWER'
            WHEN d.loc_cap = 22 THEN 'UPPER'
            WHEN d.loc_cap = 31 THEN 'LOWER'
            WHEN d.loc_cap = 32 THEN 'UPPER'
            ELSE 'Not Set'
          END area1
        , sct_cst_tot unit_cost
        , cast(CASE WHEN c.ld_qty_oh > 0 THEN ((a.tag_cnt_qty - c.ld_qty_oh) / c.ld_qty_oh) * 100 ELSE 0 END as decimal(10,2)) pov
        , (sct_cst_tot*a.tag_cnt_qty) - (sct_cst_tot*c.ld_qty_oh) cov
        , case when a.tag_rcnt_dt IS NOT NULL THEN (sct_cst_tot*a.tag_rcnt_qty) END secondCountAmount
        , (sct_cst_tot*c.ld_qty_oh) ext
        , case when a.tag_rcnt_dt IS NOT NULL THEN CASE WHEN c.ld_qty_oh > 0 THEN cast(((a.tag_rcnt_qty - c.ld_qty_oh) / c.ld_qty_oh) * 100 as decimal(10,2)) END END qtyPercentChange
        , c.ld_ref ld_ref
        , tag_rcnt_cnv
        , tag_type
        , tag_cnt_nam
        , tag_cnt_nam
        , tag_rcnt_nam
        , pt_um pt_um
        , loc_type
      FROM tag_mstr a
      LEFT JOIN (
        select pt_part
          , max(CONCAT(pt_desc1, pt_desc2)) fullDesc
          , max(pt_um) pt_um
        from pt_mstr
        WHERE pt_domain = 'EYE'
        group by pt_part
      ) b ON b.pt_part = a.tag_part
      left join (
        select sum(ld_qty_oh) ld_qty_oh
          , ld_part
          , ld_loc
          , ld_ref
          , ld_lot
        from ld_det
        where ld_domain = 'EYE'
        group by ld_part, ld_loc, ld_ref, ld_lot
      ) c ON c.ld_part = a.tag_part
        and c.ld_loc = a.tag_loc
        and c.ld_ref = a.tag_ref
        and c.ld_lot = a.tag_serial
      left join (
        select loc_loc, max(loc_cap) loc_cap, max(loc_type) loc_type
        from loc_mstr
        where loc_domain = 'EYE'
        group by loc_loc
      ) d ON d.loc_loc = CAST(a.tag_loc AS CHAR(25))
      left join (
        select sct_part
          , max(sct_cst_tot) sct_cst_tot
        FROM sct_det
        WHERE sct_sim = 'Standard'
          and sct_domain = 'EYE'
          and sct_site = 'EYE01'
        group by sct_part
      ) e ON e.sct_part = a.tag_part
      WHERE a.tag_domain = 'EYE'
        and a.tag_void = 0
        and (tag_type = 'I' OR (tag_type = 'B' AND a.tag_cnt_dt IS NOT NULL))
      ORDER BY
        case
          when loc_type IN ('COI', 'FG', 'WH')
            THEN UPPER(CAST(SUBSTRING(LTRIM(RTRIM(a.tag_loc)), 3, LENGTH(a.tag_loc)) AS CHAR(25)))
          ELSE UPPER(CAST(a.tag_loc AS CHAR(25)))
        END ASC,
        a.tag_nbr ASC
    `;

    const [qadRows, printRows] = await Promise.all([
      this.qadOdbcService.query<Array<Record<string, unknown>>>(mainSql, { target }),
      this.mysqlService.query<RowDataPacket[]>(`
        SELECT type, max(created_date) created_date, tag_nbr
        FROM eyefidb.physical_inventory
        GROUP BY tag_nbr, type
      `),
    ]);

    const printedTagMap = new Map<string, string>();
    for (const row of printRows) {
      const tagNbr = String(row.tag_nbr ?? row.TAG_NBR ?? '').trim();
      const type = String(row.type ?? row.TYPE ?? '').trim().toLowerCase();
      const createdDate = String(row.created_date ?? row.CREATED_DATE ?? '').trim();
      if (!tagNbr || !type || !createdDate) {
        continue;
      }
      printedTagMap.set(`${tagNbr}|${type}`, createdDate);
    }

    for (const row of qadRows) {
      const tagNbr = String(row.tag_nbr ?? row.TAG_NBR ?? '').trim();

      const tagLoc = String(row.TAG_LOC ?? row.tag_loc ?? '').replace(/\s+/g, '');
      const tagLocReal = String(row.TAG_LOC_REAL ?? row.tag_loc_real ?? '').replace(/\s+/g, '');
      row.TAG_LOC = tagLoc;
      row.TAG_LOC_REAL = tagLocReal;

      row.firstCountPrintTag = printedTagMap.get(`${tagNbr}|first counts`) ?? null;
      row.secondCountPrintTag = printedTagMap.get(`${tagNbr}|second counts`) ?? null;
      row.thirdCountPrintTag = printedTagMap.get(`${tagNbr}|third counts`) ?? null;
    }

    return qadRows;
  }

  async getLastTag(target?: QadOdbcTarget): Promise<Array<Record<string, unknown>>> {
    const sql = `
      SELECT max(a.tag_nbr) tag_nbr
      FROM tag_mstr a
      WHERE a.tag_domain = 'EYE'
    `;

    return this.qadOdbcService.query<Array<Record<string, unknown>>>(sql, { target });
  }

  async save(
    data: Array<string | number>,
    type: string,
    target?: QadOdbcTarget,
  ): Promise<{ message: string; inserted: number; target: string }> {
    const normalizedType = String(type || '').trim();
    const tags = Array.isArray(data)
      ? data.map((tag) => String(tag).trim()).filter(Boolean)
      : [];

    if (!normalizedType) {
      throw new BadRequestException('type is required');
    }

    if (tags.length === 0) {
      throw new BadRequestException('data must contain at least one tag');
    }

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    for (const tagNbr of tags) {
      await this.mysqlService.execute(
        `
          INSERT INTO eyefidb.physical_inventory (
            created_date,
            tag_nbr,
            type
          ) VALUES (
            ?,
            ?,
            ?
          )
        `,
        [now, tagNbr, normalizedType],
      );
    }

    return {
      message: 'Saved',
      inserted: tags.length,
      target: target || 'default',
    };
  }

  async getInventorySummary(target?: QadOdbcTarget): Promise<PhysicalInventorySummary> {
    const data = await this.getInventoryTags(target);

    const stats = {
      totalTags: data.length,
      completedFirstCounts: 0,
      completedSecondCounts: 0,
      completedThirdCounts: 0,
      firstCountVariance: 0,
      secondCountVariance: 0,
      outstandingFirstCounts: 0,
      outstandingSecondCounts: 0,
      postedTags: 0,
      unpostedTags: 0,
      bulkTagsWithQty: 0,
      totalValue: 0,
      varianceValue: 0,
    };

    for (const tag of data) {
      const hasFirstCount = Boolean(tag.tag_cnt_dt);
      const hasSecondCount = Boolean(tag.tag_rcnt_dt);
      const hasThirdCount = Boolean(tag.thirdCountPrintTag);
      const qtyOnHand = Number(tag.LD_QTY_OH ?? 0);
      const firstQty = Number(tag.TAG_CNT_QTY ?? 0);
      const secondQty = Number(tag.TAG_RCNT_QTY ?? 0);

      if (hasFirstCount) {
        stats.completedFirstCounts += 1;
        if (firstQty !== qtyOnHand) {
          stats.firstCountVariance += 1;
        }
      } else {
        stats.outstandingFirstCounts += 1;
      }

      if (hasSecondCount) {
        stats.completedSecondCounts += 1;
        if (secondQty !== qtyOnHand) {
          stats.secondCountVariance += 1;
        }
      }

      if (hasThirdCount) {
        stats.completedThirdCounts += 1;
      }

      if (String(tag.tag_posted ?? '0') === '1') {
        stats.postedTags += 1;
      } else {
        stats.unpostedTags += 1;
      }

      if (String(tag.tag_type ?? '') === 'B' && qtyOnHand > 0) {
        stats.bulkTagsWithQty += 1;
      }

      const unitCost = Number(tag.UNIT_COST ?? 0);
      stats.totalValue += unitCost * qtyOnHand;
      stats.varianceValue += Number(tag.COV ?? 0);
    }

    const statsFirstCountVariance = stats.firstCountVariance;
    const statsSecondCountVariance = stats.secondCountVariance;
    stats.outstandingSecondCounts = Math.max(statsFirstCountVariance - stats.completedSecondCounts, 0);

    const progress = {
      firstCount: stats.totalTags > 0 ? Math.round((stats.completedFirstCounts / stats.totalTags) * 100) : 0,
      secondCount:
        statsFirstCountVariance > 0
          ? Math.round((stats.completedSecondCounts / statsFirstCountVariance) * 100)
          : 100,
      thirdCount:
        statsSecondCountVariance > 0
          ? Math.round((stats.completedThirdCounts / statsSecondCountVariance) * 100)
          : 100,
      posted: stats.totalTags > 0 ? Math.round((stats.postedTags / stats.totalTags) * 100) : 0,
    };

    return {
      stats,
      progress,
      lastUpdated: new Date().toISOString(),
      target: target || 'default',
    };
  }
}
