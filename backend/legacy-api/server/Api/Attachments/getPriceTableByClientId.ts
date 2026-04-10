import db from "@/startup/db";
import { Request, Response } from "express";
import { setErrorDefault } from "@/common/error-handling";

export const getPriceTableByClientId = async (
  req: Request | any,
  res: Response
) => {
  try {
    let { client_id } = req.params;
    let { price_table_id } = req.query;
    let data = await getPriceTableByClientIdService(client_id, price_table_id);

    res.send(data);
  } catch (err) {
    setErrorDefault(err, res);
  }
};

export const getPriceTableByClientIdService = async (
  client_id: string,
  price_table_id: string | number
) => {
  try {
    let q = `
            SELECT a.id
                , a.GPI
                , a.Claim_ID
                , a.Quantity_Dispensed
                
                , case when e.id IS NOT NULL THEN e.invoice_price ELSE a.pc_invoice_price END set_to_invoice_price
                , case when e.id IS NOT NULL THEN e.proposed_price ELSE a.pc_proposed_price END set_to_prposed_price
                , a.pc_invoice_price current_pc_invoice_price
                , a.pc_proposed_price current_pc_proposed_price
                , c.atty_law_firm_id

                , dd.table_name price_table_name
                , dd.id price_table_id

                , e.min_qty
                , e.max_qty
                , e.price_table_id
                , e.invoice_price price_table_invoice_price
                , e.proposed_price price_table_proposed_price
            FROM view_patient_claim a 
            left join clients b ON b.id = a.Cardholder_ID 
            left join attorney c ON c.client_id = a.Cardholder_ID
            left join price_table dd ON dd.active = 1
            left join (
                select a.id
                    , a.gpi
                    , a.price_table_id
                    , a.invoice_price
                    , a.proposed_price
                    , a.min_qty
                    , a.max_qty
                from price_table_bucket a
            ) e ON e.gpi = a.GPI 
                and a.Quantity_Dispensed between e.min_qty and e.max_qty 
                and e.price_table_id = dd.id
            where a.Cardholder_ID = ? 
                and dd.id = ?
            order by a.id ASC
        `;
    let data = await db.raw(q, [client_id, price_table_id]);
    return data[0];
  } catch (err) {
    throw err;
  }
};
