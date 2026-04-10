<?php

namespace EyefiDb\Api\supply_plan;

use PDO;
use PDOException;

class SupplyPlan
{

       protected $db;

       public function __construct($dbQad, $db)
       {
              $this->db = $dbQad;
              $this->db1 = $db;
       }

       public function run()
       {
              return $this->createColumnsAndStructureData();
       }

       public function createColumnsAndStructureData()
       {
              $qry = "
                     SELECT customer
                            , partNumber part_number
                            , subBom sub_bom
                            , forecastType ordering_type
                            , action
                            , qty
                     FROM eyefidb.supply_chain a
                     ORDER BY createdDate ASC
		";
              $query = $this->db1->prepare($qry);
              $query->execute();
              $results = $query->fetchAll(PDO::FETCH_ASSOC);

              // $in_array = array();
              // foreach ($results as $row) {
              //        $in_array[] = $row['part_number'];
              // }

              // $in = "'" . implode("','", $in_array) . "'";

              // $qry = "
              //        select pt_part
              //               , max(pt_desc1) pt_desc1
              //               , max(pt_desc2) pt_desc2
              //        from pt_mstr
              //        WHERE pt_domain = 'EYE'
              //               and pt_site = 'EYE01'
              //               AND pt_part IN ($in)
              //        group by pt_part
              // ";
              // $query = $this->db->prepare($qry);
              // $query->execute();
              // $results1 = $query->fetchAll(PDO::FETCH_ASSOC);

              //set columns
              $SALESHISTORY = $this->salesHistory();
              $OPENSALES = $this->openSalesOrder();
              $SAFETY = $this->safetyStock();
              $OPENPO = $this->openPo();
              $STOCK = $this->stock();
              $OPENWORKORDERS = $this->openWorkOrders();

              foreach ($results as &$row) {

                     //START SALES HISTORY
                     foreach ($SALESHISTORY['salesColumns'] as $key => $value2) {
                            $row[$value2] = "";
                     }
                     $row['sales_history_avg'] = "";
                     //END SALES HISTORY

                     //START OPEN SALES
                     foreach ($OPENSALES['openSalesColumns'] as $key => $value2) {
                            $row[$value2] = "";
                     }
                     //END OPEN SALES

                     //START STOCK
                     foreach ($STOCK['stockColumns'] as $key => $value2) {
                            $row[$value2] = "";
                     }
                     //END STOCK

                     //START SAFETY STOCK
                     foreach ($SAFETY['safetyStockColumns'] as $key => $value2) {
                            $row[$value2] = "";
                     }
                     //END SAFETY STOCK

                     //START OPEN PO
                     foreach ($OPENPO['openPoColumns'] as $key => $value2) {
                            $row[$value2] = "";
                     }
                     $row['open_po_jiaxing_total'] = "";
                     //END OPEN PO

                     //START OPEN WORKORDERS
                     foreach ($OPENWORKORDERS['openWorkOrdersColumns'] as $key => $value2) {
                            $row[$value2] = "";
                     }
                     //END OPEN WORKORDERS

              }

              //Put values in there correct cell
              foreach ($results as $key => $value) {

                     //START OPEN WORK ORDERS
                     foreach ($OPENWORKORDERS['openWorkOrderDetails'] as &$row) {
                            //match by part number
                            if ($results[$key]['part_number'] == $row['WO_PART']) {
                                   foreach ($OPENWORKORDERS['openWorkOrdersColumns'] as &$row1) {
                                          $month = substr($row1, strrpos($row1, '_') + 1);
                                          //match by month
                                                 //sum qty
                                                 $results[$key][$row1] = $row['OPENQTY'];
                                   }
                            }
                     }
                     //END  OPEN WORK ORDERS

                     //START SALES HISTORY
                     $salesHistorySum = 0;
                     foreach ($SALESHISTORY['salesDetails'] as &$row) {
                            //match by part number
                            if ($results[$key]['part_number'] == $row['SOD_PART']) {
                                   $salesHistoryMonthCount = count($SALESHISTORY['salesColumns']);
                                   foreach ($SALESHISTORY['salesColumns'] as &$row1) {
                                          $month = substr($row1, strrpos($row1, '_') + 1);
                                          //match by month
                                          if ($month == $this->convertMonthNumberToName($row['MONTH']) . "-" . $row['YEAR']) {
                                                 $salesHistorySum = $row['SOD_QTY_ORD'] + $salesHistorySum;
                                                 //sum qty
                                                 $results[$key][$row1] = $row['SOD_QTY_ORD'];
                                          }
                                   }
                                   //calculate avg
                                   $results[$key]['sales_history_avg'] = round($salesHistorySum / $salesHistoryMonthCount, 0);
                            }
                     }
                     //END SALES HISTORY

                     //START OPEN SALES
                     $totalOpenSales = 0;
                     foreach ($OPENSALES['openSalesDetails'] as &$row) {
                            //match by part number
                            if ($results[$key]['part_number'] == $row['SOD_PART']) {
                                   foreach ($OPENSALES['openSalesColumns'] as &$row1) {
                                          $month = substr($row1, strrpos($row1, '_') + 1);
                                          //match by month
                                          if ($month == $this->convertMonthNumberToName($row['MONTH']) . "-" . $row['YEAR']) {
                                                 $totalOpenSales = $row['QTYOPEN'] + $totalOpenSales;
                                                 //sum qty
                                                 $results[$key][$row1] = $row['QTYOPEN'];
                                          }
                                   }
                                   //sum total
                                   $results[$key]['open_sales_total'] = $totalOpenSales;
                            }
                     }
                     //END OPEN SALES

                     //START SAFETY STOCK
                     foreach ($SAFETY['safetyStockDetails'] as &$row) {
                            //match by part number
                            $partNumberToSearch = $results[$key]['sub_bom'] != "" ? $results[$key]['sub_bom'] : $results[$key]['part_number'];
                            if ($partNumberToSearch == $row['PT_PART']) {
                                   foreach ($SAFETY['safetyStockColumns'] as &$row1) {
                                          $results[$key]['safety_stock_cost'] = $row['COST'];
                                          $results[$key]['safety_stock_qty'] = $row['QTY'];
                                   }
                            }
                     }
                     //END SAFETY STOCK

                     //START STOCK

                     $stockRawTotal = 0;
                     $stockTopLevelTotal = 0;
                     foreach ($STOCK['stockDetails'] as &$row) {
                            //match by part number
                            if ($results[$key]['part_number'] == $row['IN_PART']) {

                                   $stockTopLevelTotal = $row['TOPLEVELTOTAL'] + $stockTopLevelTotal;
                                   foreach ($STOCK['stockColumns'] as &$row1) {
                                          $results[$key]['stock_topLevel'] = $row['TOPLEVELTOTAL'];
                                   }
                            }

                            if ($results[$key]['sub_bom'] == $row['IN_PART']) {
                                   $stockRawTotal = $row['RAWTOTAL'] + $stockRawTotal;
                                   foreach ($STOCK['stockColumns'] as &$row1) {
                                          $results[$key]['stock_raw'] = $row['RAWTOTAL'];
                                   }
                            }

                            //sum total
                            $results[$key]['stock_all'] = $stockRawTotal + $stockTopLevelTotal;
                     }
                     //END STOCK

                     //START OPEN PO
                     $openPoTotal = 0;
                     foreach ($OPENPO['openPoDetails'] as &$row) {
                            //match by part number
                            $partNumberToSearch = $results[$key]['sub_bom'] != "" ? $results[$key]['sub_bom'] : $results[$key]['part_number'];
                            if ($partNumberToSearch == $row['POD_PART']) {
                                   foreach ($OPENPO['openPoColumns'] as &$row1) {
                                          $month = substr($row1, strrpos($row1, '_') + 1);
                                          //match by month
                                          if ($month == $this->convertMonthNumberToName($row['MONTH']) . "-" . $row['YEAR']) {
                                                 $openPoTotal = $row['QTY_OPEN'] + $openPoTotal;
                                                 //sum qty
                                                 $results[$key][$row1] = $row['QTY_OPEN'];
                                          }
                                   }
                                   //sum total
                                   $results[$key]['open_po_jiaxing_total'] = $openPoTotal;
                            }
                     }
                     //END OPEN PO

              }

              return array(
                     "results" => $results,
                     "salesHistory" => $SALESHISTORY,
                     "openPo" => $OPENPO,
                     "openSales" => $OPENSALES,
                     "safetyStock" => $SAFETY,
                     "stock" => $STOCK,
                     "openWorkOrders" => $OPENWORKORDERS,
              );
       }

       public function template()
       {
              $qry = "
                     SELECT customer
                            , partNumber part_number
                            , subBom sub_bom
                            , forecastType forecast_type
                     FROM eyefidb.supply_chain a
		";
              $query = $this->db1->prepare($qry);
              $query->execute();
              return $query->fetchAll(PDO::FETCH_ASSOC);
       }

       public function safetyStock()
       {

              $mainQry = "
                     select a.pt_part pt_part
                            , pt_sfty_stk qty
                            , pt_sfty_stk * sct_cst_tot cost
                     from pt_mstr a

                     LEFT JOIN ( 
                            select sct_part
                                   , max(sct_cst_tot) sct_cst_tot
                            from sct_det
                            WHERE sct_sim = 'Standard' 
                                   and sct_domain = 'EYE' 
                                   and sct_site  = 'EYE01'
                            group by sct_part
                     ) d ON CAST(a.pt_part AS CHAR(25)) = d.sct_part 

                     where a.pt_domain = 'EYE' 
                            and a.pt_sfty_stk > 0
                     WITH (NOLOCK)
              ";

              $query = $this->db->prepare($mainQry);
              $query->execute();
              $results = $query->fetchAll(PDO::FETCH_ASSOC);

              $columns = array("safety_stock_cost", "safety_stock_qty");

              $uniqueColumns = array("safetyStockColumns" => $columns, "safetyStockDetails" => $results);

              return $uniqueColumns;
       }

       public function convertMonthNumberToName($monthNum)
       {
              $dateObj = \DateTime::createFromFormat('!m', $monthNum);
              return $dateObj->format('F'); // March
       }

       public function openPo()
       {

              $last_month_ini = new \DateTime("first day of last month");
              $from_month = $last_month_ini->format('Y-m-d');

              $date = new \DateTime(date("Y-m-d"));
              $date->modify('last day of second month');
              $to_month =  $date->format('Y-m-d');

              $qry = "
			SELECT month(a.pod_due_date) month
                            , year(a.pod_due_date) year
                            , a.pod_part pod_part
                            , sum(cast(a.pod_qty_ord-a.pod_qty_rcvd as numeric(36,0))) qty_open
                     FROM pod_det a
                     JOIN po_mstr b ON 
                            a.pod_nbr = b.po_nbr AND 
                            b.po_domain = 'EYE'
                            AND po_vend IN ('JIAMET')
                     WHERE a.pod_qty_ord != a.pod_qty_rcvd
                            AND a.pod_status NOT IN ('c', 'x')
                            AND a.pod_domain = 'EYE'
                            AND a.pod_due_date between :from_month AND :to_month
                     GROUP BY month(a.pod_due_date)
                            , year(a.pod_due_date)
                            , a.pod_part
                     ORDER BY a.pod_due_date ASC
                     with (noLock)	
		";
              $query = $this->db->prepare($qry);
              $query->bindParam(":from_month", $from_month, PDO::PARAM_STR);
              $query->bindParam(":to_month", $to_month, PDO::PARAM_STR);
              $query->execute();
              $results = $query->fetchAll(PDO::FETCH_ASSOC);


              $columns = array();

              foreach ($results as $row) {
                     $columns[] = 'po_' . $this->convertMonthNumberToName($row['MONTH']) . "-" . $row['YEAR'];
              }

              $uniqueColumns = array(
                     "openPoColumns" => array_values(array_unique($columns, SORT_REGULAR)),
                     "openPoDetails" => $results,
                     "fromMonth" => $from_month,
                     "toMonth" => $to_month
              );

              return $uniqueColumns;
       }


       public function stock()
       {

              $itemSummary = "
                     select  b.in_part in_part
                            , sum(cast(CASE WHEN pt_part_type = 'FINGOOD' THEN b.in_qty_oh END as numeric(36,0))) topLevelTotal 
                            , sum(cast(CASE WHEN pt_part_type != 'FINGOOD' THEN b.in_qty_oh END as numeric(36,0))) rawTotal 
                            , sum(cast (b.in_qty_oh  as numeric(36,0))) total 
                            , pt_part_type
                     from in_mstr b 
                     LEFT JOIN ( 
                            select a.pt_part 
                                   , max(pt_part_type) pt_part_type 
                            from pt_mstr a  
                            WHERE pt_domain = 'EYE' 
                            GROUP BY a.pt_part 
                     ) c ON c.pt_part = b.in_part 
                     WHERE in_domain = 'EYE' AND b.in_qty_oh > 0 
                     GROUP BY b.in_part, pt_part_type 
                     WITH (NOLOCK) 
              ";
              $query = $this->db->prepare($itemSummary);
              $query->execute();
              $results = $query->fetchAll(PDO::FETCH_ASSOC);

              $columns = array("stock_raw", "stock_topLevel", "stock_all");

              $uniqueColumns = array("stockColumns" => $columns, "stockDetails" => $results);

              return $uniqueColumns;
       }

       public function openSalesOrder()
       {
              $last_month_ini = new \DateTime("first day of last month");
              $from_month = $last_month_ini->format('Y-m-d');

              $date = new \DateTime(date("Y-m-d"));
              $date->modify('last day of second month');
              $to_month =  $date->format('Y-m-d');

              $mainQry = "
                     select a.sod_part sod_part
                            , month(a.sod_due_date) month
                            , year(a.sod_due_date) year
                            , sum(cast(a.sod_qty_ord-a.sod_qty_ship as numeric(36,0))) qtyOpen
                     from sod_det a
                     WHERE sod_domain = 'EYE'
                            AND sod_qty_ord != sod_qty_ship
                            AND a.sod_due_date between :from_month AND :to_month
                     GROUP BY a.sod_part
                            , month(a.sod_due_date)
                            , year(a.sod_due_date)
                     ORDER BY a.sod_due_date ASC
                     WITH (NOLOCK)
              ";
              $query = $this->db->prepare($mainQry);
              $query->bindParam(":from_month", $from_month, PDO::PARAM_STR);
              $query->bindParam(":to_month", $to_month, PDO::PARAM_STR);
              $query->execute();
              $results = $query->fetchAll(PDO::FETCH_ASSOC);

              $columns = array();

              foreach ($results as $row) {
                     $columns[] = 'os_' . $this->convertMonthNumberToName($row['MONTH']) . "-" . $row['YEAR'];
              }

              $uniqueColumns = array(
                     "openSalesColumns" => array_values(array_unique($columns, SORT_REGULAR)),
                     "openSalesDetails" => $results,
                     "fromMonth" => $from_month,
                     "toMonth" => $to_month
              );

              return $uniqueColumns;
       }

       public function salesHistory()
       {


              $last_month_ini = new \DateTime(date("Y-m-d"));
              $last_month_date = $last_month_ini->modify('first day of -3 month');
              $fromMonth = $last_month_date->format('Y-m-d');

              $last_month_ini_ = new \DateTime(date("Y-m-d"));
              $last_month_date_ = $last_month_ini_->modify('last day of -1 month');
              $toMonth = $last_month_date_->format('Y-m-d');

              $mainQry = "
                     select a.sod_part sod_part
                            , month
                            , year
                            , sum(cast(a.sod_qty_ord as numeric(36,0))) sod_qty_ord
                     from sod_det a
                     
                     join (
                            select abs_shipto
                                   , month(abs_shp_date) month
                                   , year(abs_shp_date) year
                                   , abs_item
                                   , abs_line
                                   , sum(abs_ship_qty) abs_ship_qty
                                   , abs_inv_nbr
                                   , abs_par_id
                                   , abs_order
                            from abs_mstr 
                            where abs_domain = 'EYE'
                                   AND abs_shp_date between '" . $fromMonth . "' AND '" . $toMonth . "'
                            GROUP BY abs_shipto
                                   , month(abs_shp_date) 
                                   , year(abs_shp_date) 
                                   , abs_item
                                   , abs_line
                                   , abs_inv_nbr
                                   , abs_par_id
                                   , abs_order
                     ) f ON f.abs_order = a.sod_nbr
                            AND f.abs_line = a.sod_line
                            
                     WHERE sod_domain = 'EYE'
                     GROUP BY a.sod_part
                            , month
                            , year
                     ORDER BY month ASC, year ASC
                     WITH (NOLOCK)
              ";

              $query = $this->db->prepare($mainQry);
              $query->execute();
              $results = $query->fetchAll(PDO::FETCH_ASSOC);

              $columns = array();

              foreach ($results as $row) {
                     $columns[] = 'sh_' . $this->convertMonthNumberToName($row['MONTH']) . "-" . $row['YEAR'];
              }

              $uniqueColumns = array(
                     "salesColumns" => array_values(array_unique($columns, SORT_REGULAR)),
                     "salesDetails" => $results,
                     "fromMonth" => $fromMonth,
                     "toMonth" => $toMonth
              );

              return $uniqueColumns;
       }

       public function openWorkOrders()
       {

              $last_month_ini = new \DateTime(date("Y-m-d"));
              $last_month_date = $last_month_ini->modify('first day of -2 month');
              $fromMonth = $last_month_date->format('Y-m-d');

              $last_month_ini_ = new \DateTime(date("Y-m-d"));
              $last_month_date_ = $last_month_ini_->modify('last day of this month');
              $toMonth = $last_month_date_->format('Y-m-d');

              $qry = "
                     select a.wo_part wo_part
                            , sum(a.wo_qty_ord) wo_qty_ord
                            , sum(a.wo_qty_comp) wo_qty_comp
                            , count(a.wo_nbr)  openQty
                     from wo_mstr a
                     JOIN (
                            select wod_nbr
                            from wod_det 
                            where wod_qty_req != wod_qty_iss
                                   AND wod_domain = 'EYE'
                     ) b ON b.wod_nbr = a.wo_nbr
                     where a.wo_domain = 'EYE' 
                            and wo_status = 'R'
                     GROUP BY a.wo_part
                     ORDER BY a.wo_due_date ASC
                     WITH (nolock)
              ";
              $query = $this->db->prepare($qry);
              $query->execute();
              $results = $query->fetchAll(PDO::FETCH_ASSOC);

              $columns = array();

              foreach ($results as $row) {
                     $columns[] = 'ow_Orders';
              }

              $uniqueColumns = array(
                     "openWorkOrdersColumns" => array_values(array_unique($columns, SORT_REGULAR)),
                     "openWorkOrderDetails" => $results,
                     "fromMonth" => $fromMonth,
                     "toMonth" => $toMonth
              );

              return $uniqueColumns;
       }

       public function save($data)
       {
              if (
                     $this->user_full_name == 'Ritz Dacanay' ||
                     $this->user_full_name == 'Mike Brown' ||
                     $this->user_full_name == 'Marti Cowan'
              ) {
                     $sql = "
                            INSERT INTO eyefidb.supply_chain (customer, partNumber, subBom, forecastType) 
                            VALUES(:customer, :partNumber, :subBom, :forecastType ) ON 
                            DUPLICATE KEY UPDATE customer=VALUES(customer), 
                            partNumber=VALUES(partNumber), 
                            subBom=VALUES(subBom), 
                            forecastType=VALUES(forecastType)
                     ";
                     $query = $this->db1->prepare($sql);
                     $query->bindParam(":customer", $data['customer'], PDO::PARAM_STR);
                     $query->bindParam(":partNumber", $data['part_number'], PDO::PARAM_STR);
                     $query->bindParam(":subBom", $data['sub_bom'], PDO::PARAM_STR);
                     $query->bindParam(":forecastType", $data['ordering_type'], PDO::PARAM_STR);
                     $query->execute();
                     $count = $query->rowCount();
                     if ($count == '0') {
                            echo "Failed !";
                     } else {
                            echo "Success !";
                     }
              } else {
                     throw new PDOException("Access Denied. ", 401);
              }
       }
}
