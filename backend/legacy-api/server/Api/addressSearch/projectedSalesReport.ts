import { Request, Response } from "express";
import db from "@/startup/db";
import Handlebars from "handlebars";
import { setErrorDefault } from "@/common/error-handling";
import { currencyFormatter } from "@/util/currencyFormatter";

Handlebars.registerHelper("distanceFixed", function (distance) {
  return currencyFormatter.format(distance || 0);
});

async function getData(
  dateFrom: string,
  dateTo: string,
  allRecords = "false",
  status = "Active"
) {
  try {
    let sql = `
        SELECT a.*
            , Pharmacy_Name
            , e.mbr_status
            , d.law_firm
            , e.cl_first_name
            , e.cl_last_name
            , (select DATE_FORMAT(last_upload_date, "%c/%d/%Y") last_upload_date from last_claims_file_uploaded) last_updated
        FROM view_invoice_report_v1 a

        LEFT JOIN (
            SELECT s1.CardHolder_Id
                , s1.Pharmacy_Name
            FROM view_patient_claim s1
            JOIN (
                SELECT CardHolder_Id, MAX(Date_of_Service) AS Date_of_Service
                FROM view_patient_claim
                GROUP BY CardHolder_Id
            ) AS s2 ON s1.CardHolder_Id = s2.CardHolder_Id 
                AND s1.Date_of_Service = s2.Date_of_Service
            group by s1.CardHolder_Id
                , s1.Pharmacy_Name
            ORDER BY CardHolder_Id
        ) b ON b.CardHolder_Id = a.client_id

        join attorney c ON c.client_id = a.client_id
        join lawyers d ON d.id = c.atty_law_firm_id
        left join clients e ON e.id = a.client_id
        where sub_total > 0
    `;

    if (status == "Discharged") {
      sql += ` AND e.mbr_status = 'Discharged' AND balance = 0 AND total_payment_confirmed_amount IS NOT NULL `;
    } else {
      sql += ` AND e.mbr_status != 'Discharged' `;
    }

    const data: any[] = await db.raw(sql);

    return data[0];
  } catch (err) {
    throw err;
  }
}
export const projectedSalesReport = async (
  req: Request | any,
  res: Response
) => {
  let { dateFrom, dateTo, allRecords, status } = req.query;
  try {
    let data = await getData(dateFrom, dateTo, allRecords, status);
    res.send(data);
  } catch (err) {
    setErrorDefault(err, res);
  }
};
