import { Inject, Injectable } from '@nestjs/common';
import { ResultSetHeader } from 'mysql2/promise';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { parseDateInput } from '@/shared/utils/date.util';

@Injectable()
export class LateReasonCodesService {
  constructor(@Inject(MysqlService) private readonly mysqlService: MysqlService) {}

  async read(department: string): Promise<Array<Record<string, unknown>>> {
    const hasDepartment = String(department || '').trim().length > 0;
    const sql = `
      SELECT *
        , '0' selected
      FROM eyefidb.lateReasonCodes
      WHERE active = 1
      ${hasDepartment ? 'AND department = ?' : ''}
      ORDER BY name ASC
    `;

    const params = hasDepartment ? [department.trim()] : [];
    return this.mysqlService.query<RowDataPacket[]>(sql, params);
  }

  async save(payload: { newItem?: string; department?: string }): Promise<number> {
    const name = String(payload?.newItem || '').trim();
    const department = String(payload?.department || '').trim();
    if (!name) {
      return 0;
    }

    const sql = `
      INSERT INTO eyefidb.lateReasonCodes (name, department)
      VALUES (?, ?)
    `;

    const result = await this.mysqlService.execute<ResultSetHeader>(sql, [name, department]);
    return result.insertId || 0;
  }

  async remove(payload: { id?: number | string }): Promise<number> {
    const id = Number(payload?.id || 0);
    if (!id) {
      return 0;
    }

    const sql = `
      UPDATE eyefidb.lateReasonCodes
      SET active = 0
      WHERE id = ?
    `;

    await this.mysqlService.execute<ResultSetHeader>(sql, [id]);
    return 1;
  }

  async kpi(params: {
    dateFrom: string;
    dateTo: string;
    typeOfView: string;
    displayCustomers: boolean;
    queue: string;
  }): Promise<Record<string, unknown>> {
    const results = await this.getEveryDetails(params.dateFrom, params.dateTo, params.queue);

    // Keep shape compatible with legacy endpoint used by dashboards/charts.
    return {
      obj: { label: [] as string[] },
      chart: {},
      chartnew: this.buildChartNew(results, params),
      results,
    };
  }

  private async getEveryDetails(
    weekStartDate: string,
    weekEndDate: string,
    queue: string,
  ): Promise<Array<Record<string, unknown>>> {
    let sql = '';
    const values: Array<string> = [weekStartDate, weekEndDate];

    if (queue === 'All') {
      sql = `
        SELECT date abs_shp_date
          , totalSum shipped_qty
          , n so_cust
          , MONTH(date) month
          , YEAR(date) year
          , WEEK(date) week
        FROM (
          SELECT date
            , SUM(hits) totalSum
            , n
          FROM (
            SELECT DATE(createDate) date
              , n
              , COUNT(*) hits
            FROM userTrans a
            WHERE field = 'Late Reason Code changed'
              AND n != ''
            GROUP BY so, DATE(createDate), n
            ORDER BY DATE(createDate) DESC
          ) a
          GROUP BY date, n
          ORDER BY date DESC
        ) a
        WHERE date BETWEEN ? AND ?
        ORDER BY totalSum DESC
      `;
    } else {
      sql = `
        SELECT date abs_shp_date
          , totalSum shipped_qty
          , n so_cust
          , MONTH(date) month
          , YEAR(date) year
          , WEEK(date) week
          , is_so
          , is_wo_10
          , is_wo_20
          , is_wo_30
        FROM (
          SELECT date
            , SUM(hits) totalSum
            , n
            , is_so
            , is_wo_10
            , is_wo_20
            , is_wo_30
          FROM (
            SELECT DATE(createDate) date
              , n
              , COUNT(*) hits
              , (CASE WHEN LOCATE('SO', so) OR LOCATE('SV', so) THEN 1 ELSE 0 END) is_so
              , (CASE WHEN LOCATE('-10', so) AND field = 'Late Reason Code changed' THEN 1 ELSE 0 END) is_wo_10
              , (CASE WHEN LOCATE('-20', so) AND field = 'Late Reason Code changed' THEN 1 ELSE 0 END) is_wo_20
              , (CASE WHEN LOCATE('-30', so) AND field = 'Late Reason Code changed' THEN 1 ELSE 0 END) is_wo_30
            FROM userTrans a
            WHERE field = 'Late Reason Code changed'
              AND n != ''
            GROUP BY so, DATE(createDate), n
              , LOCATE('SO', so)
              , (CASE WHEN LOCATE('-10', so) AND field = 'Late Reason Code changed' THEN 1 ELSE 0 END)
              , (CASE WHEN LOCATE('-20', so) AND field = 'Late Reason Code changed' THEN 1 ELSE 0 END)
              , (CASE WHEN LOCATE('-30', so) AND field = 'Late Reason Code changed' THEN 1 ELSE 0 END)
            ORDER BY DATE(createDate) DESC
          ) a
          GROUP BY date, n, is_so, is_wo_10, is_wo_20, is_wo_30
          ORDER BY date DESC
        ) a
        WHERE date BETWEEN ? AND ?
      `;

      if (queue === 'Sales Order') {
        sql += ' AND is_so = 1';
      }
      if (queue === 'WO-10') {
        sql += ' AND is_wo_10 = 1';
      }
      if (queue === 'WO-20') {
        sql += ' AND is_wo_20 = 1';
      }
      if (queue === 'WO-30') {
        sql += ' AND is_wo_30 = 1';
      }

      sql += ' ORDER BY totalSum DESC';
    }

    return this.mysqlService.query<RowDataPacket[]>(sql, values);
  }

  private buildChartNew(
    results: Array<Record<string, unknown>>,
    params: { dateFrom: string; dateTo: string; typeOfView: string; displayCustomers: boolean },
  ): Record<string, unknown> {
    const chartNew: Record<string, unknown> = {};

    const start = parseDateInput(params.dateFrom);
    const end = parseDateInput(params.dateTo);
    if (!start || !end) {
      return chartNew;
    }

    const totalsByLabel: Record<string, number> = {};
    const formatLabel = (date: Date): string => {
      if (params.typeOfView === 'Daily') {
        return date.toLocaleDateString('en-US');
      }
      if (params.typeOfView === 'Monthly') {
        return `${date.toLocaleString('en-US', { month: 'short' })}-${date.getFullYear()}`;
      }
      if (params.typeOfView === 'Annually') {
        return `${date.getFullYear()}`;
      }
      if (params.typeOfView === 'Quarterly') {
        const q = Math.ceil((date.getMonth() + 1) / 3);
        return `${q}-${date.getFullYear()}`;
      }
      const yearStart = new Date(Date.UTC(date.getFullYear(), 0, 1));
      const dayNum = Math.floor((date.getTime() - yearStart.getTime()) / 86400000) + 1;
      const week = Math.ceil(dayNum / 7);
      return `${week}-${date.getFullYear()}`;
    };

    for (const row of results) {
      const rawDate = row.abs_shp_date || row.ABS_SHP_DATE;
      const shipped = Number(row.shipped_qty || row.SHIPPED_QTY || 0);
      if (!rawDate) {
        continue;
      }

      const parsedDate = parseDateInput(String(rawDate));
      if (!parsedDate) {
        continue;
      }

      const key = formatLabel(parsedDate);
      totalsByLabel[key] = (totalsByLabel[key] || 0) + shipped;
    }

    chartNew.nocustomer = {
      dataset: Object.values(totalsByLabel),
      label: 'Total $ Shipped',
      backgroundColor: '#8FBC8F',
      type: 'bar',
    };

    return chartNew;
  }
}
