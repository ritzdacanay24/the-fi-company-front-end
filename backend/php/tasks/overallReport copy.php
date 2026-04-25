<?php
header('Content-type: application/json; charset=UTF-8');
date_default_timezone_set('America/Los_Angeles');
class OverallReport
{

    protected $db;


    public function __construct($db, $dbQad)
    {
        $this->db = $db;
        $this->dbQad = $dbQad;
        $this->nowDate = date("Y-m-d");
        $this->nowDateTime = date("Y-m-d H:i:s", time());
    }

    public function shippingReportOriginal()
    {
        $mainQry = "
                select sum(case when a.sod_due_date < curDate() AND sod_qty_ord != sod_qty_ship AND so_compl_date IS NULL THEN 1 ELSE 0 END) past_due_lines,
                sum(case when a.sod_due_date = curDate() AND sod_qty_ord != sod_qty_ship AND so_compl_date IS NULL  THEN 1 ELSE 0 END) lines_due_at_start_of_the_day,
                sum(case when sod_qty_ord != sod_qty_ship AND so_compl_date IS NULL THEN 1 ELSE 0 END) lines_due,
                SUM(case when a.sod_due_date = curDate() THEN a.sod_price*(a.sod_qty_ord-a.sod_qty_ship) ELSE 0 END) value_due_to_ship_today,
                SUM(case when a.sod_due_date < curDate() AND sod_qty_ord != sod_qty_ship AND so_compl_date IS NULL THEN a.sod_price*(a.sod_qty_ord-a.sod_qty_ship) ELSE 0 END) value_past_due,
                SUM(case when a.sod_due_date < curDate() AND sod_qty_ord != sod_qty_ship AND so_compl_date IS NULL THEN a.sod_price*(a.sod_qty_ord-a.sod_qty_ship) ELSE 0 END) over_due_amount
                from sod_det a
                left join (
                    select so_nbr, so_compl_date
                    from so_mstr
                    where so_domain = 'EYE'
                ) c ON c.so_nbr = a.sod_nbr

                WHERE sod_domain = 'EYE'
                WITH (NOLOCK)
            ";
        $query = $this->dbQad->prepare($mainQry);
        $query->execute();
        return $query->fetch(PDO::FETCH_ASSOC);
    }

    public function shippingReport()
    {
        $mainQry = "
                select total_open_overdue
                    , total_open_due
                    , total_open_future
                    , total_open_overdue_val
                    , total_open_due_val
                    , total_open_future_val
                    , total_open_val
                    , total_lines_shipped_overdue
                    , total_lines_shipped_due
                    , total_lines_shipped_future
                    , total_lines_shipped_today
                    , total_lines_shipped_overdue_val
                    , total_lines_shipped_due_val
                    , total_lines_shipped_future_val
                    , total_lines_shipped_today_val
                    , total_open_overdue+total_lines_shipped_overdue total_lines_overdue
                    , total_open_due+total_lines_shipped_due total_lines_due
                    , total_open_future+total_lines_shipped_future total_lines_future

                    , total_open_overdue_val+total_lines_shipped_overdue_val total_lines_overdue_val
                    , total_open_due_val+total_lines_shipped_due_val total_lines_due_val
                    , total_open_future_val+total_lines_shipped_future_val total_lines_future_val
                    , (total_open_overdue_val+total_lines_shipped_overdue_val) + (total_open_due_val+total_lines_shipped_due_val) + (total_open_future_val+total_lines_shipped_future_val) total_lines_val

                    , on_time_delivery_today_count
                    , (on_time_delivery_today_count/(total_open_due+total_lines_shipped_due))*100 on_time_delivery_today_percent
                    
                    , (total_lines_shipped_due_val/(total_open_due_val+total_lines_shipped_due_val))*100 value_percentage_today_completed
                    , lines_shipped_partial_overdue
                    , lines_shipped_partial_due
                    , lines_shipped_partial_future
                    , total_open_line_orders_this_week
                    , total_due
                from ( 
                    select 
                    
                        SUM(case when a.sod_due_date = curDate()THEN 1 ELSE 0 END) total_due,

                        SUM(case when a.sod_due_date < curDate() AND sod_qty_ord != sod_qty_ship THEN 1 ELSE 0 END) total_open_overdue,
                        SUM(case when a.sod_due_date = curDate() AND sod_qty_ord != sod_qty_ship THEN 1 ELSE 0 END) total_open_due,
                        SUM(case when a.sod_due_date > curDate() AND sod_qty_ord != sod_qty_ship THEN 1 ELSE 0 END) total_open_future,
                        sum(case when sod_qty_ord != sod_qty_ship THEN 1 ELSE 0 END) total_open,

                        sum(case when a.sod_due_date < curDate() THEN sod_list_pr*(sod_qty_ord - sod_qty_ship) ELSE 0 END ) total_open_overdue_val,
                        sum(case when a.sod_due_date = curDate() THEN sod_list_pr*(sod_qty_ord - sod_qty_ship) ELSE 0 END ) total_open_due_val,
                        sum(case when a.sod_due_date > curDate() THEN sod_list_pr*(sod_qty_ord - sod_qty_ship) ELSE 0 END ) total_open_future_val,
                        sum(sod_list_pr*(sod_qty_ord - sod_qty_ship)) total_open_val,

                        sum(case when a.sod_due_date < abs_shp_date THEN 1 ELSE 0 END ) total_lines_shipped_overdue, 
                        sum(case when a.sod_due_date = abs_shp_date THEN 1 ELSE 0 END ) total_lines_shipped_due,  
                        sum(case when a.sod_due_date > abs_shp_date THEN 1 ELSE 0 END ) total_lines_shipped_future, 
                        count(abs_shp_date) total_lines_shipped_today, 
        
                        sum(case when a.sod_due_date < curDate() THEN sod_list_pr*abs_ship_qty ELSE 0 END ) total_lines_shipped_overdue_val,
                        sum(case when a.sod_due_date = curDate() THEN sod_list_pr*abs_ship_qty ELSE 0 END ) total_lines_shipped_due_val, 
                        sum(case when a.sod_due_date > curDate() THEN sod_list_pr*abs_ship_qty ELSE 0 END ) total_lines_shipped_future_val, 
                        sum(sod_list_pr*abs_ship_qty) total_lines_shipped_today_val,

                        sum(case when a.sod_due_date = abs_shp_date AND sod_qty_ord = sod_qty_ship THEN 1 ELSE 0 END ) on_time_delivery_today_count,

                        sum(case when sod_qty_ord - sod_qty_ship > 0 AND a.sod_due_date < abs_shp_date THEN 1 ELSE 0 END ) lines_shipped_partial_overdue,
                        sum(case when sod_qty_ord - sod_qty_ship > 0 AND a.sod_due_date = abs_shp_date THEN 1 ELSE 0 END ) lines_shipped_partial_due,
                        sum(case when sod_qty_ord - sod_qty_ship > 0 AND a.sod_due_date > abs_shp_date THEN 1 ELSE 0 END ) lines_shipped_partial_future,
                        sum(case when week(a.sod_due_date) = week(curDate()) AND year(a.sod_due_date) = year(curDate()) AND sod_qty_ord != sod_qty_ship THEN 1 ELSE 0 END ) total_open_line_orders_this_week
                    from sod_det a

                    join (
                        select so_nbr	
                        from so_mstr
                        where so_domain = 'EYE'
                        AND so_compl_date IS NULL
                    ) c ON c.so_nbr = a.sod_nbr

                    LEFT join (
                        select abs_shipto
                            , abs_shp_date
                            , abs_item
                            , abs_line
                            , sum(abs_ship_qty) abs_ship_qty
                            , abs_inv_nbr
                            , abs_par_id
                            , abs_order
                        from abs_mstr 
                        where abs_domain = 'EYE'
                        GROUP BY abs_shipto
                            , abs_shp_date
                            , abs_item
                            , abs_line
                            , abs_inv_nbr
                            , abs_par_id
                            , abs_order
                    ) f ON f.abs_order = a.sod_nbr
                        AND f.abs_line = a.sod_line

                    WHERE sod_domain = 'EYE'
                
                ) a 
                WITH (NOLOCK)
            ";
        $query = $this->dbQad->prepare($mainQry);
        $query->execute();
        return $query->fetch(PDO::FETCH_ASSOC);
    }

    public function onTimeDelivery()
    {
        $mainQry = "
        select count(f.abs_order) total_shipped_today
        , SUM(case when abs_shp_date >= a.sod_due_date THEN 1 ELSE 0 END) tS
        , SUM(case when abs_shp_date = a.sod_due_date THEN 1 ELSE 0 END) due_today_count
        , SUM(case when abs_shp_date > a.sod_due_date THEN 1 ELSE 0 END) overdue_count
        , SUM(case when abs_shp_date < a.sod_due_date THEN 1 ELSE 0 END) future_count
        , sum(case when abs_shp_date = curDate() THEN sod_list_pr*abs_ship_qty ELSE 0 END ) total_ship_today_value
        , sum(case when a.sod_due_date = curDate() THEN sod_list_pr*abs_ship_qty ELSE 0 END ) total_due_today_ship_today_value
        , sum(case when a.sod_qty_ord = f.abs_ship_qty AND abs_shp_date = a.sod_due_date THEN 1 ELSE 0 END) on_time_delivery_today
    from sod_det a    
    LEFT join (
        select abs_shipto
            , abs_shp_date
            , abs_item
            , abs_line
            , sum(abs_ship_qty) abs_ship_qty
            , abs_inv_nbr
            , abs_par_id
            , abs_order
        from abs_mstr 
        where abs_domain = 'EYE'
        GROUP BY abs_shipto
            , abs_shp_date
            , abs_item
            , abs_line
            , abs_inv_nbr
            , abs_par_id
            , abs_order
    ) f ON f.abs_order = a.sod_nbr
        AND f.abs_line = a.sod_line
        and abs_shp_date = curDate()
    
    WHERE sod_domain = 'EYE'
    ORDER BY a.sod_due_date ASC WITH (NOLOCK)
        ";
        $query = $this->dbQad->prepare($mainQry);
        $query->execute();
        return $query->fetch(PDO::FETCH_ASSOC);
    }

    public function productionCompleted()
    {
        $mainQry = "
            select sum(op_qty_comp*sct_cst_tot) value_completed_today,
                COUNT(op_wo_op) total_work_orders_count
            from op_hist 

            LEFT JOIN (  
                select sct_part 
                    , max(sct_cst_tot) sct_cst_tot 
                from sct_det 
                WHERE sct_sim = 'Standard'    
                    and sct_domain = 'EYE' 
                    and sct_site  = 'EYE01'
                group by sct_part  
            ) d ON CAST(op_hist.op_part AS CHAR(25)) = d.sct_part 

            where op_tran_date = curDate()
            and op_domain = 'EYE'
            and op_wo_op = 20
            and op_type = 'BACKFLSH'
            WITH (NOLOCK)
        ";
        $query = $this->dbQad->prepare($mainQry);
        $query->execute();
        return $query->fetch(PDO::FETCH_ASSOC);
    }

    public function productionOrders()
    {
        $mainQry = "
            select total_open_in_queue
                , total_open_overdue
                , total_open_due
                , total_open_future
                , total_overdue_completed
                , total_dueToday_completed
                , total_future_completed
                , total_completed_today

                , total_open_overdue + total_overdue_completed total_overdue
                , total_open_due + total_dueToday_completed total_due
                , total_open_future + total_future_completed total_future
                , total_open_in_queue + total_completed_today total_in_queue

                , (total_completed_today / (total_open_in_queue + total_completed_today) ) * 100 percent_plan_overall_completed
                , case when total_dueToday_completed > 0 THEN (total_dueToday_completed / (total_open_due + total_dueToday_completed) ) * 100 ELSE 0 END percent_plan_due_today_completed
            from (
                
                select sum(case when wr_qty_inque > 0 THEN 1 ELSE 0 END) total_open_in_queue
                , sum(case when due_by < curDate() and wr_qty_inque > 0 THEN 1 ELSE 0 END) total_open_overdue
                , sum(case when due_by = curDate() and wr_qty_inque > 0 THEN 1 ELSE 0 END) total_open_due
                , sum(case when due_by > curDate() and wr_qty_inque > 0 THEN 1 ELSE 0 END) total_open_future

                , sum(case when op_tran_date < due_by THEN 1 ELSE 0 END) total_overdue_completed
                , sum(case when op_tran_date = due_by THEN 1 ELSE 0 END) total_dueToday_completed
                , sum(case when op_tran_date > due_by THEN 1 ELSE 0 END) total_future_completed
                , count(op_tran_date) total_completed_today
            from (
                select CASE 
                    WHEN b.wo_so_job = 'dropin' 
                        THEN wr_due
                    ELSE 
                        CASE 
                            WHEN a.wr_op = 10
                                THEN 
                                    CASE 
                                        WHEN DAYOFWEEK ( wr_due ) IN (1)
                                            THEN wr_due - 6
                                            WHEN DAYOFWEEK ( wr_due ) IN (2)
                                                THEN wr_due - 7
                                                WHEN DAYOFWEEK ( wr_due ) IN (3)
                                                    THEN wr_due - 7
                                                    WHEN DAYOFWEEK ( wr_due ) IN (4)
                                                        THEN wr_due - 7
                                                        WHEN DAYOFWEEK ( wr_due ) IN (5)
                                                            THEN wr_due - 7
                                                            WHEN DAYOFWEEK ( wr_due ) IN (6)
                                                                THEN wr_due - 8
                                                                WHEN DAYOFWEEK ( wr_due ) IN (7)
                                                                    THEN wr_due - 5
                                        ELSE wr_due - 5
                            END 
                            WHEN a.wr_op = 20
                                THEN 
                                CASE 
                                        WHEN DAYOFWEEK ( wr_due ) IN (1)
                                            THEN wr_due - 4
                                            WHEN DAYOFWEEK ( wr_due ) IN (2)
                                                THEN wr_due - 5
                                                WHEN DAYOFWEEK ( wr_due ) IN (3)
                                                    THEN wr_due - 5
                                                    WHEN DAYOFWEEK ( wr_due ) IN (4)
                                                        THEN wr_due - 5
                                                        WHEN DAYOFWEEK ( wr_due ) IN (5)
                                                            THEN wr_due - 3
                                                            WHEN DAYOFWEEK ( wr_due ) IN (6)
                                                                THEN wr_due - 3
                                                                WHEN DAYOFWEEK ( wr_due ) IN (7)
                                                                    THEN wr_due - 3
                                        ELSE wr_due - 3
                                END 
                            WHEN a.wr_op = 30
                                THEN 
                                CASE 
                                WHEN DAYOFWEEK ( wr_due ) IN (1)
                                    THEN wr_due - 2
                                    WHEN DAYOFWEEK ( wr_due ) IN (2, 3)
                                        THEN wr_due - 4
                                    WHEN DAYOFWEEK ( wr_due ) IN (4)
                                        THEN wr_due - 2
                                    ELSE wr_due - 2
                                END 			
                        END 
                END due_by
                , wr_qty_inque
                , op_tran_date
                from wr_route a

                JOIN (
                    SELECT wo_nbr
                        , min(wo_ord_date) wo_ord_date
                        , max(wo_so_job) wo_so_job
                        , max(wo_rmks) wo_rmks
                        , max(wo_status) wo_status
                        , max(wo_rel_date) wo_rel_date
                    FROM wo_mstr
                    WHERE wo_domain = 'EYE'
                        AND wo_status IN ('R', 'F', 'A')
                    GROUP BY wo_nbr
                ) b ON b.wo_nbr = a.wr_nbr

                LEFT JOIN (
                    select op_wo_nbr
                        , op_qty_comp
                        , op_wo_nbr
                        , op_tran_date
                    from op_hist 
                    where op_type = 'BACKFLSH'  
                        AND op_wo_op = '20'  
                        and op_tran_date = curDate() 
                        and op_domain = 'EYE'
                ) c ON c.op_wo_nbr = a.wr_nbr

                where wr_op = 20 
                    and wr_domain = 'EYE' 
            ) a
            ) a
        ";
        $query = $this->dbQad->prepare($mainQry);
        $query->execute();
        return $query->fetch(PDO::FETCH_ASSOC);
    }


    public function productionOrdersOriginal()
    {
        $mainQry = "
            SELECT count(a.wr_nbr) total
                , sum(sct_cst_tot * (a.wr_qty_ord - a.wr_qty_comp)) total_value
                , sum(case when f.op_tran_date < wr_due AND a.wr_qty_ord = op_qty_comp THEN 1 ELSE 0 END) production_on_time_delivery
                , SUM(case when CASE 
                WHEN b.wo_so_job = 'dropin' 
                    THEN wr_due
                ELSE 
                    CASE 
                        WHEN a.wr_op = 20
                            THEN 
                            CASE 
                                    WHEN DAYOFWEEK ( wr_due ) IN (1)
                                        THEN wr_due - 4
                                        WHEN DAYOFWEEK ( wr_due ) IN (2, 3, 4)
                                            THEN wr_due - 5
                                                    WHEN DAYOFWEEK ( wr_due ) IN (5, 6)
                                                        THEN wr_due - 3
                                                            WHEN DAYOFWEEK ( wr_due ) IN (7)
                                                                THEN wr_due - 3
                                    ELSE wr_due - 3
                            END 			
                    END 
            END = CURDATE() then 1 ELSE 0 END) total_lines_due_today
            , SUM(case when CASE 
            WHEN b.wo_so_job = 'dropin' 
                THEN wr_due
            ELSE 
                CASE 
                    WHEN a.wr_op = 20
                        THEN 
                        CASE 
                                WHEN DAYOFWEEK ( wr_due ) IN (1)
                                    THEN wr_due - 4
                                    WHEN DAYOFWEEK ( wr_due ) IN (2, 3, 4)
                                        THEN wr_due - 5
                                                WHEN DAYOFWEEK ( wr_due ) IN (5, 6)
                                                    THEN wr_due - 3
                                                        WHEN DAYOFWEEK ( wr_due ) IN (7)
                                                            THEN wr_due - 3
                                ELSE wr_due - 3
                        END 			
                END 
        END < CURDATE() then 1 ELSE 0 END) total_lines_over_due
            FROM wr_route a

            JOIN (
                SELECT wo_nbr
                    , wo_ord_date
                    , wo_so_job
                    , wo_rmks
                    , wo_status
                    , wo_rel_date
                FROM wo_mstr
                WHERE wo_domain = 'EYE'
                    AND wo_status IN ('R', 'F', 'A')
            ) b ON b.wo_nbr = a.wr_nbr
            
            LEFT JOIN ( 
                select pt_part
                    , max(pt_desc1) pt_desc1
                    , max(pt_desc2) pt_desc2
                from pt_mstr
                WHERE pt_domain = 'EYE'
                group by pt_part
            ) f ON f.pt_part = a.wr_part
            
            LEFT JOIN (
                SELECT a.wr_nbr wr_nbr
                    , a.wr_qty_comp wr_qty_comp
                    , a.wr_qty_ord
                FROM wr_route a
                WHERE a.wr_domain = 'EYE'
                AND a.wr_qty_ord != a.wr_qty_comp
                AND a.wr_op IN ('10')
            ) c ON c.wr_nbr = a.wr_nbr

            
            LEFT JOIN (
                SELECT a.wr_nbr wr_nbr
                    , a.wr_qty_comp wr_qty_comp
                    , a.wr_qty_ord
                FROM wr_route a
                WHERE a.wr_domain = 'EYE'
                AND a.wr_qty_ord != a.wr_qty_comp
                AND a.wr_op IN ('20')
            ) d ON d.wr_nbr = a.wr_nbr

            
            left join (
                select a.wod_nbr
                    , sum(a.wod_qty_req - a.wod_qty_iss) lineStatus
                from wod_det a 
                JOIN pt_mstr c 
                    ON c.pt_part = a.wod_part
                        AND pt_domain = 'EYE'
                        AND c.pt_part_type != 'Hardware' AND c.pt_part_type != 'HDW' 
                WHERE wod_domain = 'EYE'
                        AND a.wod_qty_req > 0	
                GROUP BY a.wod_nbr
            ) e ON e.wod_nbr = a.wr_nbr

            LEFT JOIN ( 
                select sct_part
                    , max(sct_cst_tot) sct_cst_tot
                from sct_det
                WHERE sct_sim = 'Standard' 
                    and sct_domain = 'EYE' 
                    and sct_site  = 'EYE01'
                group by sct_part
            ) d ON CAST(a.wr_part AS CHAR(25)) = d.sct_part
            
            left join (
                select op_wo_nbr
                , SUM(op_qty_comp) op_qty_comp 
                , max(op_tran_date) op_tran_date
                from op_hist

                where  op_domain = 'EYE'
                and op_wo_op = 20
                group by op_wo_nbr
            ) f ON f.op_wo_nbr = a.wr_nbr

            WHERE a.wr_domain = 'EYE'
                AND a.wr_qty_ord != a.wr_qty_comp
                AND wo_status != 'c'
                AND WR_STATUS != 'C'
                AND a.wr_op IN ('10','20')
                AND a.wr_op = 20 AND ( c.wr_qty_comp > d.wr_qty_comp OR c.wr_qty_comp IS NULL )
            with (noLock)  
        ";
        $query = $this->dbQad->prepare($mainQry);
        $query->execute();
        return $query->fetch(PDO::FETCH_ASSOC);
    }

    public function metrics()
    {
        $mainQry = "
            SELECT * 
            FROM eyefidb.metrics
            ORDER by id DESC 
            LIMIT 1
        ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        return $query->fetch(PDO::FETCH_ASSOC);
    }


    public function insert($data)
    {
        $mainQry = "
            INSERT INTO eyefidb.sales_order_report (so, line, due_date, qty_ordered, part_number)
            VALUES (:so, :line, :due_Date, :qty_ordered, :part_number)
        ";
        $stmt = $this->db->prepare($mainQry);
        $stmt->bindParam(':so', $data['so'], PDO::PARAM_STR);
        $stmt->bindParam(':line', $data['line'], PDO::PARAM_STR);
        $stmt->bindParam(':due_date', $data['due_date'], PDO::PARAM_STR);
        $stmt->bindParam(':qty_ordered', $data['qty_ordered'], PDO::PARAM_STR);
        $stmt->bindParam(':part_number', $data['part_number'], PDO::PARAM_STR);
        $stmt->execute();
    }

    public function nf($number)
    {
        return number_format($number, 2, '.', '');
    }
    public function moneyFormat($number)
    {
        return "$" . number_format($number, 2, ".", ",");
    }

    public function run()
    {
        $production = $this->productionOrders();
        $shipping = $this->shippingReport();
        // $onTimeShipmentReport = $this->onTimeDelivery();
        // $productionCompleted = $this->productionCompleted();

        return array(
            "status" => "Live Report",
            "last_refreshed" => $this->nowDateTime,
            "shipping" => $shipping,
            "production" => $production
        );
    }

    public function runOriginal()
    {

        return $shipping = $this->shippingReport();
        $onTimeShipmentReport = $this->onTimeDelivery();
        $production = $this->productionOrders();
        $productionCompleted = $this->productionCompleted();

        $metrics = $this->metrics();

        $totalAmountDueToday = ($shipping['VALUE_DUE_TO_SHIP_TODAY'] + $onTimeShipmentReport['TOTAL_DUE_TODAY_SHIP_TODAY_VALUE']);
        return array(
            "shipping" => array(
                "overdue" => array(
                    "total_lines_6am_snapshot" => $metrics['shipping_past_due_lines_6am'],
                    "total_open_lines" => $shipping['PAST_DUE_LINES'],
                    "value_6am_snapshot" => $this->moneyFormat($metrics['shipping_overdue_amount_6am']),
                    "value" => $this->moneyFormat($shipping['VALUE_PAST_DUE']),
                ),
                "due_today" => array(
                    "total_lines_6am_snapshot" => $metrics['shipping_lines_due_6am'],
                    "total_lines" => $shipping['LINES_DUE_AT_START_OF_THE_DAY'],
                    "value_6am_snapshot" => $this->moneyFormat($metrics['shipping_value_due_to_ship_today_6am']),
                    // "total_amount" => $this->moneyFormat($totalAmountDueToday),
                    "value" => $this->moneyFormat($shipping['VALUE_DUE_TO_SHIP_TODAY']),
                    "value_shipped" => $this->moneyFormat($onTimeShipmentReport['TOTAL_DUE_TODAY_SHIP_TODAY_VALUE']),
                    "value_percentage_completed" => $this->nf(($onTimeShipmentReport['TOTAL_DUE_TODAY_SHIP_TODAY_VALUE'] / $totalAmountDueToday) * 100) . '%',
                    "on_time_delivery" => array(
                        "on_time_delivery_count" => $onTimeShipmentReport['ON_TIME_DELIVERY_TODAY'],
                        "on_time_delivery_percent" => $this->nf(($onTimeShipmentReport['ON_TIME_DELIVERY_TODAY'] / $shipping['LINES_DUE_AT_START_OF_THE_DAY']) * 100) . '%',
                    )
                ),
                "lines_shipped_today" => array(
                    "overdue" => $onTimeShipmentReport['OVERDUE_COUNT'],
                    "due_today" => $onTimeShipmentReport['DUE_TODAY_COUNT'],
                    "future" => $onTimeShipmentReport['FUTURE_COUNT'],
                    "overdue + due_today" => $onTimeShipmentReport['TS'],
                    "total_shipped_today" => $onTimeShipmentReport['TOTAL_SHIPPED_TODAY'],
                    "value_shipped_today" => $this->moneyFormat($onTimeShipmentReport['TOTAL_SHIP_TODAY_VALUE']),
                ),
                "total_lines" => $shipping['LINES_DUE'],
            ),
            "production" => array(
                "overdue_lines" => array(
                    "total_6am_snapshot" => $metrics['production_total_wo_lines_overdue_6am'],
                    "total_lines" => $production['TOTAL_LINES_OVER_DUE'] + $production['TOTAL_LINES_DUE_TODAY']
                ),
                "due_today_lines" => array(
                    "total_6am_snapshot" => $metrics['production_wo_lines_due_today_6am'],
                    "total_lines" => $production['TOTAL_LINES_DUE_TODAY'],
                    "cost_value_due_today_6am_snapshot" => $this->moneyFormat($metrics['production_value_due_today_6am']),
                    "total_lines_completed" => "UC",
                    "total_line_value_completed" => "UC",
                ),
                "processed_work_order_lines_today" => array(
                    "value_completed_today" => $this->moneyFormat($productionCompleted['VALUE_COMPLETED_TODAY']),
                    "total_work_orders_completed_today" => $productionCompleted['TOTAL_WORK_ORDERS_COUNT'],
                ),
                "percent_otd_today" => $production['PRODUCTION_ON_TIME_DELIVERY'],
                "percent_plan_complete" => $this->nf(($productionCompleted['VALUE_COMPLETED_TODAY'] / $production['TOTAL_VALUE']) * 100) . '%',

            )
        );
    }
}

use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Databases\DatabaseQad;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();

$data = new OverallReport($db, $dbQad);

$results = $data->run();
echo json_encode($results, JSON_PRETTY_PRINT | JSON_NUMERIC_CHECK);
