import { Inject, Injectable } from '@nestjs/common';
import { QadOdbcService } from '@/shared/database/qad-odbc.service';

@Injectable()
export class InventoryByProdLineService {
  constructor(
    @Inject(QadOdbcService)
    private readonly qadOdbcService: QadOdbcService,
  ) {}

  async getPastDueOrders(): Promise<unknown> {
    const prodLineDetailsSql = `
      select max(pl_prod_line) PT_PROD_LINE
        , pl_desc pl_desc
      FROM pl_mstr a
      WHERE pl_domain = 'EYE'
        AND pl_prod_line != ''
      group by pl_desc
    `;

    const prodLineTotalsSql = `
      select cast(SUM(a.ld_qty_oh*c.sct_cst_tot) as numeric(36,2)) sumCount
        , b.pt_prod_line pt_prod_line
      FROM ld_det a
      LEFT JOIN pt_mstr b ON a.ld_part = b.pt_part AND b.pt_domain = 'EYE'

      LEFT JOIN (
        select sct_part
          , max(sct_cst_tot) sct_cst_tot
        from sct_det
        WHERE sct_sim = 'Standard'
          and sct_domain = 'EYE'
          and sct_site  = 'EYE01'
        group by sct_part
      ) c ON b.pt_part = c.sct_part

      WHERE ld_domain = 'EYE'
        and a.ld_qty_oh > 0
        and case when (
          RIGHT(b.pt_part, 1) != 'U' AND RIGHT(b.pt_part, 1) != 'R' AND RIGHT(b.pt_part, 1) != 'N'
        ) THEN '-' ELSE 'COI' END <> 'COI'
      GROUP BY b.pt_prod_line
    `;

    const detailsSql = `
      select cast(sum(a.ld_qty_oh) as numeric(36,2)) qtyOh
        , SUM(a.ld_qty_oh*c.sct_cst_tot) totalValue
        , ld_part
        , max(b.pt_article) pt_article
        , max(b.pt_prod_line) pt_prod_line
        , max(d.pl_desc) pl_desc
        , max(b.pt_desc1) || ' ' || max(b.pt_desc2) fullDesc
      FROM ld_det a
      LEFT JOIN pt_mstr b ON a.ld_part = b.pt_part AND b.pt_domain = 'EYE'

      LEFT JOIN (
        select pl_prod_line
          , pl_desc
        FROM pl_mstr a
        WHERE pl_domain = 'EYE'
          AND pl_prod_line != ''
      ) d ON d.pl_prod_line = b.pt_prod_line

      LEFT JOIN (
        select sct_part
          , max(sct_cst_tot) sct_cst_tot
        from sct_det
        WHERE sct_sim = 'Standard'
          and sct_domain = 'EYE'
          and sct_site  = 'EYE01'
        group by sct_part
      ) c ON b.pt_part = c.sct_part

      WHERE ld_domain = 'EYE'
        and a.ld_qty_oh > 0
        and case when (
          RIGHT(b.pt_part, 1) != 'U' AND RIGHT(b.pt_part, 1) != 'R' AND RIGHT(b.pt_part, 1) != 'N'
        ) THEN '-' ELSE 'COI' END <> 'COI'
      GROUP BY ld_part
      ORDER BY sum(a.ld_qty_oh*c.sct_cst_tot) DESC
    `;

    const prodLineDetails = await this.qadOdbcService.query<Array<Record<string, unknown>>>(prodLineDetailsSql);
    const prodLineTotals = await this.qadOdbcService.query<Array<Record<string, unknown>>>(prodLineTotalsSql);
    const details = await this.qadOdbcService.query<Array<Record<string, unknown>>>(detailsSql);

      const result: {
        inventorySum: number;
        label?: unknown[];
        value?: unknown[];
        details: Array<Record<string, unknown>>;
      } = {
        inventorySum: 0,
        details,
      };

      if (prodLineDetails.length > 0) {
        for (const row of prodLineDetails) {
          for (const total of prodLineTotals) {
            const line = row['PT_PROD_LINE'] ?? row['pt_prod_line'];
            const totalLine = total['PT_PROD_LINE'] ?? total['pt_prod_line'];
            if (line === totalLine) {
              const amountRaw = total['SUMCOUNT'] ?? total['sumcount'] ?? 0;
              const amount = Number(amountRaw) || 0;
              result.inventorySum += amount;
              result.label = result.label || [];
              result.value = result.value || [];
              result.label.push(row['PL_DESC'] ?? row['pl_desc']);
              result.value.push(amountRaw);
            }
          }
        }
      }

    return result;
  }

  async getSafetyStock(): Promise<Array<Record<string, unknown>>> {
    const safetyStockSql = `
      select *
      from (
        select a.pt_desc1 as PT_DESC1
          , onHandQty * sct_cst_tot as TOTAL
          , a.pt_desc2 as PT_DESC2
          , a.pt_part as PT_PART
          , a.pt_part_type as PT_PART_TYPE
          , c.onHandQty as ONHANDQTY
          , d.sct_cst_tot as SCT_CST_TOT
          , c.loc_type as LOC_TYPE
          , case when (
              RIGHT(a.pt_part, 1) != 'U' AND RIGHT(a.pt_part, 1) != 'R' AND RIGHT(a.pt_part, 1) != 'N'
            ) THEN '-' ELSE 'COI' END as IS_COI
        from pt_mstr a
          left join (
            select sct_part
              , max(sct_cst_tot) as sct_cst_tot
            from sct_det
            WHERE sct_sim = 'Standard'
              and sct_domain = 'EYE'
              and sct_site = 'EYE01'
            group by sct_part
          ) d ON CAST(a.pt_part AS CHAR(25)) = d.sct_part
          join (
            select a.ld_part
              , sum(ld_qty_oh) as onHandQty
              , loc_type
            from ld_det a
            join (
              select loc_loc, loc_type
              from loc_mstr
              WHERE loc_domain = 'EYE' and loc_type = 'SS'
              group by loc_loc, loc_type
            ) cc ON cc.loc_loc = a.ld_loc
            where a.ld_domain = 'EYE'
              and a.ld_qty_oh > 0
            GROUP BY a.ld_part, loc_type
          ) c ON c.ld_part = a.pt_part
        where pt_domain = 'EYE'
      ) a
      WHERE IS_COI <> 'COI'
    `;

    return this.qadOdbcService.query<Array<Record<string, unknown>>>(safetyStockSql);
  }
}
