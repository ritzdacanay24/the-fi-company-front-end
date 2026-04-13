<?php
/**test */
namespace EyefiDb\Api\DailyReport;
ini_set('memory_limit', '1024G');

use PDO;
use PDOException;


date_default_timezone_set('America/Los_Angeles');

class DailyReport
{

    protected $db;
    public $domain;


    public function __construct($db, $dbQad)
    {
        $this->db = $db;
        $this->dbQad = $dbQad;
        $this->nowDate = date("Y-m-d");
        $this->nowDateTime = date("Y-m-d H:i:s", time());
        $this->domain = 'EYE';

    }

    public function shippingReport()
    {

        $mainQry = "
        select overdue_open + due_open open_total_lines 	
			, overdue_open_val + due_open_val total_lines_overdue_value
			, overdue_shipped_val + due_shipped_val + future_shipped_val total_shipped_today_value
			, overdue_shipped + due_shipped + future_shipped total_shipped_today_lines
			, on_time_delivery_today
			, case when total_lines_due_today > 0 THEN (on_time_delivery_today / total_lines_due_today)*100 ELSE 0 END on_time_delivery_today_percent
            , total_open
            , case when total_open > 0 THEN (shipped_today_total / total_open ) * 100 ELSE 0 END percent_plan_overall_completed
            , CASE WHEN (due_open_val+due_shipped_val) > 0 THEN (due_shipped_val/(due_shipped_val+due_open_val))*100 ELSE 0 END value_percentage_today_completed
            , due_shipped_val+due_open_val total_open_value_today
            , total_lines_due_today
            , overdue_open_val + due_open_val + future_open_val total_open_value
            , min_date
            , max_date
    from ( 
        select 
        
            SUM(case when a.sod_per_date < '" . $this->nowDate . "' AND sod_qty_ord != sod_qty_ship AND c.so_compl_date IS NULL THEN 1 ELSE 0 END) overdue_open,
            SUM(case when a.sod_per_date = '" . $this->nowDate . "' AND sod_qty_ord != sod_qty_ship AND c.so_compl_date IS NULL THEN 1 ELSE 0 END) due_open,

            sum(case when a.sod_per_date < '" . $this->nowDate . "' AND c.so_compl_date IS NULL THEN sod_list_pr*(sod_qty_ord - sod_qty_ship) ELSE 0 END ) overdue_open_val,
            sum(case when a.sod_per_date = '" . $this->nowDate . "' AND c.so_compl_date IS NULL THEN sod_list_pr*(sod_qty_ord - sod_qty_ship) ELSE 0 END ) due_open_val,
            sum(case when a.sod_per_date > '" . $this->nowDate . "' AND c.so_compl_date IS NULL THEN sod_list_pr*(sod_qty_ord - sod_qty_ship) ELSE 0 END ) future_open_val,

            sum(case when a.sod_per_date < f.abs_shp_date THEN 1 ELSE 0 END ) overdue_shipped, 
            sum(case when f.abs_shp_date = a.sod_per_date AND sod_qty_ord = sod_qty_ship THEN 1 ELSE 0 END ) due_shipped,  
			sum(case when a.sod_per_date > f.abs_shp_date THEN 1 ELSE 0 END ) future_shipped, 


            sum(case when a.sod_per_date < '" . $this->nowDate . "' THEN sod_list_pr*f.abs_ship_qty ELSE 0 END ) overdue_shipped_val,
            sum(case when g.abs_shp_date = '" . $this->nowDate . "' AND a.sod_per_date = '" . $this->nowDate . "' THEN sod_list_pr*g.abs_ship_qty ELSE 0 END ) due_shipped_val, 
            sum(case when a.sod_per_date > '" . $this->nowDate . "' THEN sod_list_pr*f.abs_ship_qty ELSE 0 END ) future_shipped_val, 

            SUM(case when a.sod_per_date = '" . $this->nowDate . "' THEN 1 ELSE 0 END) due_total,
            sum(case when  sod_qty_ord - sod_qty_ship = 0 AND g.abs_ship_qty = sod_qty_ship AND a.sod_per_date = '" . $this->nowDate . "' AND g.abs_shp_date <= '" . $this->nowDate . "'  THEN 1 ELSE 0 END ) on_time_delivery_today,

            sum(case when sod_qty_ord != sod_qty_ship AND c.so_compl_date IS NULL THEN 1 ELSE 0 END) total_open,
            count(f.abs_shp_date) shipped_today_total,
            
            sum(case when a.sod_per_date = '" . $this->nowDate . "'  THEN 1 ELSE 0 END ) total_lines_due_today_,
            sum(case when a.sod_per_date = '" . $this->nowDate . "' AND  g.abs_shp_date IS NOT NULL THEN 1 ELSE 0 END ) total_lines_due_today,

            min(a.sod_per_date) min_date,
            max(a.sod_per_date) max_date
        from sod_det a

        left join (
            select so_nbr, so_compl_date
            from so_mstr
            where so_domain = '".$this->domain."'
        ) c ON c.so_nbr = a.sod_nbr

            
            LEFT join (
                select abs_line
                    , sum(abs_ship_qty) abs_ship_qty
                    , abs_order
                    , max(abs_shp_date) abs_shp_date
                from abs_mstr 
                where abs_domain = '".$this->domain."'
                and abs_shp_date = '" . $this->nowDate . "'
                and abs_ship_qty > 0
                GROUP BY  abs_line
                    , abs_order
            ) f ON f.abs_order = a.sod_nbr
                AND f.abs_line = a.sod_line

            LEFT join (
                select abs_line
                    , sum(abs_ship_qty) abs_ship_qty
                    , abs_order
                    , max(abs_shp_date) abs_shp_date
                from abs_mstr 
                where abs_domain = '".$this->domain."'
                and abs_ship_qty > 0
                GROUP BY  abs_line
                    , abs_order
            ) g ON g.abs_order = a.sod_nbr
                AND g.abs_line = a.sod_line
            

        WHERE sod_domain = '".$this->domain."'
        AND sod_project = ''
        AND sod_part != 'DISCOUNT' 
            
    ) a 
            ";
        $query = $this->dbQad->prepare($mainQry);
        $query->execute();
        return $query->fetch(PDO::FETCH_ASSOC);
    }

    public function onTime()
    {


        $mainQry = "
				select sum(case when f.abs_shp_date <= a.sod_per_date THEN 1 ELSE 0 END) shipped_before_or_on_due_date
					, sum(case when f.abs_shp_date > a.sod_per_date THEN 1 ELSE 0 END) shipped_after_due_date
                    , count(f.abs_shp_date) total_shipped_today
                    , sum(sod_list_pr*f.abs_ship_qty) total_value_shipped_today
                    , count(a.sod_nbr) toal_lines_today
                    , case 
                        when c.so_cust IN ('AMEGAM','BALTEC', 'ATI', 'INTGAM')  THEN c.so_cust
                         ELSE  'Other' END so_cust
				from sod_det a
				
                
				
				left join (
					select so_nbr	
						, so_cust
						, so_ord_date
						, so_ship
						, so_bol
						, so_cmtindx
					from so_mstr
					where so_domain = '".$this->domain."'
				) c ON c.so_nbr = a.sod_nbr
				
				LEFT join (
					select a.abs_shipto
						, a.abs_shp_date
						, a.abs_item
						, a.abs_line
						, sum(a.abs_ship_qty) abs_ship_qty
						, a.abs_inv_nbr
						, a.abs_par_id
						, a.abs_order
					from abs_mstr a
					where a.abs_domain = '".$this->domain."'
					GROUP BY a.abs_shipto
						, a.abs_shp_date
						, a.abs_item
						, a.abs_line
						, a.abs_inv_nbr
						, a.abs_par_id
						, a.abs_order
				) f ON f.abs_order = a.sod_nbr
					AND f.abs_line = a.sod_line
                    
				
				WHERE sod_domain = '".$this->domain."'
				and abs_shp_date = '" . $this->nowDate . "'
				and abs_ship_qty > 0
                AND sod_project = '' 
                AND sod_part != 'DISCOUNT'
                group by case 
                when c.so_cust IN ('AMEGAM','BALTEC', 'ATI', 'INTGAM')  THEN c.so_cust
                 ELSE  'Other' END
				ORDER BY case 
                when c.so_cust IN ('AMEGAM','BALTEC', 'ATI', 'INTGAM')  THEN c.so_cust
                 ELSE  'Other' END 
			";

        $query = $this->dbQad->prepare($mainQry);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    
    public function getWip()
    {

        $mainQry = "
            select sum(wo_wip_tot) wo_wip_tot
            from wo_mstr  
            where wo_domain = '".$this->domain."'  
            and wo_wip_tot > 0
        ";
        $query = $this->dbQad->prepare($mainQry);
        $query->execute();
        return $query->fetch(PDO::FETCH_ASSOC);
    }

    public function getData()
    {

        $mainQry = "
            select data
            from eyefidb.sales_order_report
            order by id DESC
            limit 1
        ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $results = $query->fetch(PDO::FETCH_ASSOC);
        return $results['data'];
    }

    public function productionOrders($operation)
    {
        $mainQry = "
        select sum(case when dueBy = '" . $this->nowDate . "' THEN 1 ELSE 0 END) today_count
        , sum(case when dueBy = '" . $this->nowDate . "' AND complete_status = 1 THEN 1 ELSE 0 END) completed_before_or_on_due_date
        , sum(case when dueBy = '" . $this->nowDate . "' AND complete_status = 0 THEN 1 ELSE 0 END) due_today_not_completed
        , sum(case when dueBy < '" . $this->nowDate . "' AND complete_status = 0 THEN 1 ELSE 0 END) total_overdue_orders
    from ( select wr_nbr wr_nbr
        , a.wr_qty_ord - a.wr_qty_comp openQty
        , dueBy dueBy
        , a.wr_part wr_part
        , a.wr_qty_ord
        , a.wr_qty_comp
        , op_qty_comp
        , op_tran_date
        , op_qty_comp_backflush
        , wo_status
        , case when wo_status = 'C' OR a.wr_qty_ord - a.wr_qty_comp = 0 THEN 1 ELSE 0 END complete_status
    from 
        ( 
            select a.wr_nbr, 
                a.wr_op, 
                a.wr_qty_ord, 
                a.wr_qty_wip,  
                a.wr_qty_comp, 
                a.wr_status, 
                a.wr_due, 
                a.wr_part, 
                a.wr_queue, 
                a.wr_qty_inque,
                CASE  
                    WHEN b.wo_so_job = 'dropin' 
                        THEN wr_due
                    ELSE 
                        CASE 
                            WHEN a.wr_op = 10
                                THEN 
                                    CASE 
                                        WHEN DAYOFWEEK ( wr_due ) IN (1)
                                            THEN wr_due - 4
                                            WHEN DAYOFWEEK ( wr_due ) IN (2)
                                                THEN wr_due - 4
                                                WHEN DAYOFWEEK ( wr_due ) IN (3)
                                                    THEN wr_due - 4
                                                    WHEN DAYOFWEEK ( wr_due ) IN (4)
                                                        THEN wr_due - 2
                                                        WHEN DAYOFWEEK ( wr_due ) IN (5)
                                                            THEN wr_due - 2
                                                            WHEN DAYOFWEEK ( wr_due ) IN (6)
                                                                THEN wr_due - 2
                                                                WHEN DAYOFWEEK ( wr_due ) IN (7)
                                                                    THEN wr_due - 3
                                        ELSE wr_due - 2
                            END 
                            WHEN a.wr_op = 20
                                THEN 
                                CASE 
                                        WHEN DAYOFWEEK ( wr_due ) IN (1)
                                            THEN wr_due - 3
                                            WHEN DAYOFWEEK ( wr_due ) IN (2)
                                                THEN wr_due - 3
                                                WHEN DAYOFWEEK ( wr_due ) IN (3)
                                                    THEN wr_due - 1
                                                    WHEN DAYOFWEEK ( wr_due ) IN (4)
                                                        THEN wr_due - 1
                                                        WHEN DAYOFWEEK ( wr_due ) IN (5)
                                                            THEN wr_due - 1
                                                            WHEN DAYOFWEEK ( wr_due ) IN (6)
                                                                THEN wr_due - 1
                                                                WHEN DAYOFWEEK ( wr_due ) IN (7)
                                                                    THEN wr_due - 2
                                        ELSE wr_due - 1
                                END 
                            WHEN a.wr_op = 30
                                THEN 
                                CASE 
                                WHEN DAYOFWEEK ( wr_due ) IN (1)
                                    THEN wr_due - 2
                                    WHEN DAYOFWEEK ( wr_due ) IN (2, 3)
                                        THEN wr_due - 0
                                    WHEN DAYOFWEEK ( wr_due ) IN (4)
                                        THEN wr_due - 0
                                    ELSE wr_due - 0
                                END 	
                                else wo_due_date			
                        END 
                END dueBy 
                , d.op_qty_comp
                , d.op_tran_date
                , d.op_qty_comp op_qty_comp_backflush
                , wo_status
            from wr_route a 

            left join ( 
                select wo_nbr, wo_so_job, wo_status, wo_due_date
                from wo_mstr 
                where wo_domain = '".$this->domain."' 
            ) b ON b.wo_nbr = a.wr_nbr 
            
            left join (
                select op_wo_nbr, sum(op_qty_comp) op_qty_comp, max(op_tran_date) op_tran_date
                from op_hist 
                where op_wo_op = :operation 
                and op_domain = '".$this->domain."'
                and op_type = 'BACKFLSH'
                group by op_wo_nbr
            ) d ON d.op_wo_nbr = a.wr_nbr 
            where  a.wr_domain = '".$this->domain."' 
                and a.wr_op = :operation1
        ) a
        ) b
        order by dueBy ASC
        ";
        $query = $this->dbQad->prepare($mainQry);
        $query->bindParam(':operation', $operation, PDO::PARAM_STR);
        $query->bindParam(':operation1', $operation, PDO::PARAM_STR);
        $query->execute();
        return $query->fetch(PDO::FETCH_ASSOC);
    }

    public function productionOrdersDetails($operation)
    {
        $mainQry = "
        select *
    from ( select wr_nbr wr_nbr
        , a.wr_qty_ord - a.wr_qty_comp openQty
        , dueBy dueBy
        , a.wr_part wr_part
        , a.wr_qty_ord
        , a.wr_qty_comp
        , op_qty_comp
        , op_tran_date
        , op_qty_comp_backflush
        , wr_status
        , case when wo_status = 'C' OR a.wr_qty_ord - a.wr_qty_comp = 0 THEN 1 ELSE 0 END complete_status
    from 
        ( 
            select a.wr_nbr, 
                a.wr_op, 
                a.wr_qty_ord, 
                a.wr_qty_wip,  
                a.wr_qty_comp, 
                a.wr_status, 
                a.wr_due, 
                a.wr_part, 
                a.wr_queue, 
                a.wr_qty_inque,
                CASE  
                    WHEN b.wo_so_job = 'dropin' 
                        THEN wr_due
                    ELSE 
                        CASE 
                            WHEN a.wr_op = 10
                                THEN 
                                    CASE 
                                        WHEN DAYOFWEEK ( wr_due ) IN (1)
                                            THEN wr_due - 4
                                            WHEN DAYOFWEEK ( wr_due ) IN (2)
                                                THEN wr_due - 4
                                                WHEN DAYOFWEEK ( wr_due ) IN (3)
                                                    THEN wr_due - 4
                                                    WHEN DAYOFWEEK ( wr_due ) IN (4)
                                                        THEN wr_due - 2
                                                        WHEN DAYOFWEEK ( wr_due ) IN (5)
                                                            THEN wr_due - 2
                                                            WHEN DAYOFWEEK ( wr_due ) IN (6)
                                                                THEN wr_due - 2
                                                                WHEN DAYOFWEEK ( wr_due ) IN (7)
                                                                    THEN wr_due - 3
                                        ELSE wr_due - 2
                            END 
                            WHEN a.wr_op = 20
                                THEN 
                                CASE 
                                        WHEN DAYOFWEEK ( wr_due ) IN (1)
                                            THEN wr_due - 3
                                            WHEN DAYOFWEEK ( wr_due ) IN (2)
                                                THEN wr_due - 3
                                                WHEN DAYOFWEEK ( wr_due ) IN (3)
                                                    THEN wr_due - 1
                                                    WHEN DAYOFWEEK ( wr_due ) IN (4)
                                                        THEN wr_due - 1
                                                        WHEN DAYOFWEEK ( wr_due ) IN (5)
                                                            THEN wr_due - 1
                                                            WHEN DAYOFWEEK ( wr_due ) IN (6)
                                                                THEN wr_due - 1
                                                                WHEN DAYOFWEEK ( wr_due ) IN (7)
                                                                    THEN wr_due - 2
                                        ELSE wr_due - 1
                                END 
                            WHEN a.wr_op = 30
                                THEN 
                                CASE 
                                WHEN DAYOFWEEK ( wr_due ) IN (1)
                                    THEN wr_due - 2
                                    WHEN DAYOFWEEK ( wr_due ) IN (2, 3)
                                        THEN wr_due - 0
                                    WHEN DAYOFWEEK ( wr_due ) IN (4)
                                        THEN wr_due - 0
                                    ELSE wr_due - 0
                                END 	
                                else wo_due_date			
                        END 
                END dueBy 
                , d.op_qty_comp
                , d.op_tran_date
                , d.op_qty_comp op_qty_comp_backflush
                , wo_status
            from wr_route a 

            join ( 
                select wo_nbr, wo_so_job, wo_status, wo_due_date
                from wo_mstr 
                where wo_domain = '".$this->domain."' 
            ) b ON b.wo_nbr = a.wr_nbr 
            
            left join (
                select op_wo_nbr, sum(op_qty_comp) op_qty_comp, max(op_tran_date) op_tran_date
                from op_hist 
                where op_wo_op = :operation 
                and op_domain = '".$this->domain."'
                and op_type = 'BACKFLSH'
                group by op_wo_nbr
            ) d ON d.op_wo_nbr = a.wr_nbr 
            where  a.wr_domain = '".$this->domain."' 
                and a.wr_op = :operation1

        ) a
        where dueBy = curDate()
        ) b
        order by dueBy ASC
        ";
        $query = $this->dbQad->prepare($mainQry);
        $query->bindParam(':operation', $operation, PDO::PARAM_STR);
        $query->bindParam(':operation1', $operation, PDO::PARAM_STR);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function insert($data)
    {
        $data = json_encode($data);

        $mainQry = "
            INSERT INTO eyefidb.sales_order_report (data)
            VALUES (:data)
        ";
        $stmt = $this->db->prepare($mainQry);
        $stmt->bindParam(':data', $data, PDO::PARAM_STR);
        $stmt->execute();
    }


    public function totalInventory()
    {
        $mainQry = "
            select cast(SUM(a.ld_qty_oh*c.sct_cst_tot) as numeric(36,2)) sum_count,
                sum(case when c.loc_type = 'FG' THEN a.ld_qty_oh*c.sct_cst_tot ELSE 0 END) fg_sum
            FROM ld_det a 
            LEFT JOIN pt_mstr b ON a.ld_part = b.pt_part AND b.pt_domain = '".$this->domain."' 
            
            LEFT JOIN loc_mstr c ON c.loc_loc = a.ld_loc 
                    AND c.loc_type = 'FG' 
                    AND loc_domain = '".$this->domain."'

            LEFT JOIN ( 
                select sct_part
                    , max(sct_cst_tot) sct_cst_tot
                from sct_det
                WHERE sct_sim = 'Standard' 
                    and sct_domain = '".$this->domain."' 
                    and sct_site  = 'EYE01'
                group by sct_part
            ) c ON b.pt_part = c.sct_part
            
            WHERE ld_domain = '".$this->domain."' 
                and a.ld_qty_oh > 0
                AND (
                    RIGHT(b.pt_part, 1) != 'U' AND RIGHT(b.pt_part, 1) != 'R' AND RIGHT(b.pt_part, 1) != 'N' 
                ) 
                
        ";
        $query = $this->dbQad->prepare($mainQry);
        $query->execute();
        return $query->fetch(PDO::FETCH_ASSOC);
    }

    

    public function totalProductionOrdersOriginal()
    {
        $mainQry = "
            select overdue_open
                , due_open
                , future_open
                , total_open

                , overdue_open+overdue_completed_today overdue_total
                , due_open+due_completed_today due_total
                , future_open+future_completed_today future_total
                , total_open+total_completed_today total


                , overdue_completed_today
                , due_completed_today
                , future_completed_today
                , total_completed_today
                , (due_completed_today / due_open+due_completed_today ) * 100 otd
            from (
                select sum(case when wo_due_date < '" . $this->nowDate . "' AND wo_status IN ('R', 'F', 'A') THEN 1 ELSE 0 END) overdue_open,  
                    sum(case when wo_due_date = '" . $this->nowDate . "' AND wo_status IN ('R', 'F', 'A') THEN 1 ELSE 0 END) due_open,  
                    sum(case when wo_due_date > '" . $this->nowDate . "' AND wo_status IN ('R', 'F', 'A') THEN 1 ELSE 0 END) future_open,  
                    sum(case when wo_status IN ('R', 'F', 'A') THEN 1 ELSE 0 END) total_open,   

                    sum(case when  wo_stat_close_date = '" . $this->nowDate . "' AND wo_due_date < '" . $this->nowDate . "' THEN 1 ELSE 0 END) overdue_completed_today,
                    sum(case when wo_status IN ('C') AND wo_stat_close_date = '" . $this->nowDate . "' AND wo_due_date = '" . $this->nowDate . "' THEN 1 ELSE 0 END) due_completed_today,
                    sum(case when wo_status IN ('C') AND wo_stat_close_date = '" . $this->nowDate . "' AND wo_due_date > '" . $this->nowDate . "' THEN 1 ELSE 0 END) future_completed_today,
                    sum(case when wo_status IN ('C') AND wo_stat_close_date = '" . $this->nowDate . "' THEN 1 ELSE 0 END) total_completed_today
                from wo_mstr  
                where wo_domain = '".$this->domain."' 
                and wo_status IN ('R', 'F', 'A', 'C') 
            ) a 
        ";
        $query = $this->dbQad->prepare($mainQry);
        $query->execute();
        return $query->fetch(PDO::FETCH_ASSOC);
    }

    public function nf($number)
    {
        return number_format($number, 2, '.', '') . "%";
    }
    public function moneyFormat($number)
    {
        return "$" . number_format($number, 2, ".", ",");
    }
    public function decimals($number)
    {
        return number_format($number, 2, ".", ",");
    }


    public function getAmount($money)
    {
        $cleanString = preg_replace('/([^0-9\.,])/i', '', $money);
        $onlyNumbersString = preg_replace('/([^0-9])/i', '', $money);

        $separatorsCountToBeErased = strlen($cleanString) - strlen($onlyNumbersString) - 1;

        $stringWithCommaOrDot = preg_replace('/([,\.])/', '', $cleanString, $separatorsCountToBeErased);
        $removedThousandSeparator = preg_replace('/(\.|,)(?=[0-9]{3,}$)/', '',  $stringWithCommaOrDot);

        return (int)(float) str_replace(',', '.', $removedThousandSeparator);
    }


    public function reformatPreviousValue($previousData)
    {
        if (isset($_GET['insert']) && $_GET['insert'] == 1) {
            return "";
        }
        return " <span style='color:blue'>(" . $previousData . ") </span>";
    }

    
    public function getJiaxing($location)
    {
        $qry = "
            select 
                sum(a.ld_qty_oh*d.sct_cst_tot) total_ext_cost
            from ld_det a
            LEFT JOIN ( 
                select sct_part 
                    , max(sct_cst_tot) sct_cst_tot 
                from sct_det 
                WHERE sct_sim = 'Standard' 
                    and sct_domain = '".$this->domain."'  
                    and sct_site  = 'EYE01' 
                group by sct_part 
            ) d ON a.ld_part = d.sct_part  
            where a.ld_loc = :location
                AND ld_domain = '".$this->domain."'
            ORDER BY a.ld_qty_oh*d.sct_cst_tot DESC
        ";
        $query = $this->dbQad->prepare($qry);
        $query->bindParam(':location', $location, PDO::PARAM_STR);
        $query->execute();
        return $query->fetch(PDO::FETCH_ASSOC);
    }

    
    public function getJiaxing1($location)
    {
        $qry = "
            select 
                sum(a.ld_qty_oh*d.sct_cst_tot) total_ext_cost
            from ld_det a
            LEFT JOIN ( 
                select sct_part 
                    , max(sct_cst_tot) sct_cst_tot 
                from sct_det 
                WHERE sct_sim = 'Standard' 
                    and sct_domain = '".$this->domain."'   
                    and sct_site  = 'EYE01' 
                group by sct_part 
            ) d ON a.ld_part = d.sct_part  
            where a.ld_loc = :location
                AND ld_domain = '".$this->domain."'
            ORDER BY a.ld_qty_oh*d.sct_cst_tot DESC
        ";
        $query = $this->dbQad->prepare($qry);
        $query->bindParam(':location', $location, PDO::PARAM_STR);
        $query->execute();
        return $query->fetch(PDO::FETCH_ASSOC);
    }


    public function rmlv()
    {
        
        $qry = "
        select sum(case when turns < 1.0 THEN total ELSE 0 END ) lessThanOne,
        sum(case when turns >= 1.0 THEN total ELSE 0 END) greaterThanOrEqualToOne,
        sum(total) total
            from (
                select 
                    onHandQty*sct_cst_tot total, 
                    CAST(case when onHandQty*sct_cst_tot > 0 THEN ((in_avg_iss*sct_cst_tot)/(onHandQty*sct_cst_tot))*365 ELSE 0 END AS DECIMAL(16,1)) turns,
                    case when (
						RIGHT(a.pt_part, 1) != 'U' AND RIGHT(a.pt_part, 1) != 'R' AND RIGHT(a.pt_part, 1) != 'N' 
					) THEN '-' ELSE 'COI' END is_coi
                    
            from pt_mstr a
            left join (
                    select in_part, 
                       max(in_avg_iss) in_avg_iss
                    from in_mstr 
                    where in_domain = 'EYE' 
                    and in_site = 'EYE01'
                    group by in_part
                ) b ON b.in_part = a.pt_part 
                
                LEFT JOIN ( 
                    select sct_part 
                        , max(sct_cst_tot) sct_cst_tot 
                    from sct_det 
                    WHERE sct_sim = 'Standard' 
                        and sct_domain = 'EYE'
                        and sct_site  = 'EYE01'
                    group by sct_part 
                ) d ON CAST(a.pt_part AS CHAR(25)) = d.sct_part  

                JOIN (
					select a.ld_part
						, sum(ld_qty_oh) onHandQty
					from ld_det a 
					
					JOIN ( 
						select loc_loc
						from loc_mstr 
						WHERE loc_domain = 'EYE' and loc_type NOT IN ('FG', 'SS')
						group by loc_loc 
					) cc ON cc.loc_loc = a.ld_loc 

					where a.ld_domain = 'EYE' 
					AND ld_site = 'EYE01'
					and a.ld_qty_oh > 0
					GROUP BY a.ld_part
					
				) c ON c.ld_part = a.pt_part

            where pt_domain = 'EYE' 
           ) a
           where is_coi <> 'COI'
        ";
        //add item type -> Graphics
        $stmt = $this->dbQad->prepare($qry);
        $stmt->execute(); 	
        $result = $stmt->fetch(PDO::FETCH_ASSOC); 	
        return $result;
    }

    public function jx01()
    {
        
        $qry = "
        select sum(case when turns < 1.0 THEN total ELSE 0 END ) lessThanOne,
        sum(case when turns >= 1.0 THEN total ELSE 0 END) greaterThanOrEqualToOne,
        sum(total) total
            from (
                select 
                    onHandQty*sct_cst_tot total, 
                    CAST(case when onHandQty*sct_cst_tot > 0 THEN ((in_avg_iss*sct_cst_tot)/(onHandQty*sct_cst_tot))*365 ELSE 0 END AS DECIMAL(16,1)) turns,
					case when (
						RIGHT(a.pt_part, 1) != 'U' AND RIGHT(a.pt_part, 1) != 'R' AND RIGHT(a.pt_part, 1) != 'N' 
					) THEN '-' ELSE 'COI' END is_coi
            from pt_mstr a
            left join (
                    select in_part, 
                       max(in_avg_iss) in_avg_iss
                    from in_mstr 
                    where in_domain = 'EYE' 
					and in_site = 'JX'
                    group by in_part
                ) b ON b.in_part = a.pt_part 
                
                LEFT JOIN ( 
                    select sct_part 
                        , max(sct_cst_tot) sct_cst_tot 
                    from sct_det 
                    WHERE sct_sim = 'Standard' 
                        and sct_domain = 'EYE'
						and sct_site  = 'EYE01'
                    group by sct_part 
                ) d ON CAST(a.pt_part AS CHAR(25)) = d.sct_part  

                JOIN (
                    select a.ld_part
                        , sum(ld_qty_oh) onHandQty
                    from ld_det a 
                    where a.ld_domain = 'EYE' 
					AND ld_loc = 'JX01'
                    and a.ld_qty_oh > 0
                    GROUP BY a.ld_part
                    
                ) c ON c.ld_part = a.pt_part

            where pt_domain = 'EYE' 
           ) a
           where is_coi <> 'COI'
        ";
        //add item type -> Graphics
        $stmt = $this->dbQad->prepare($qry);
        $stmt->execute(); 	
        $result = $stmt->fetch(PDO::FETCH_ASSOC); 	
        return $result;
    }

    public function all()
    {
        
        $qry = "
        select sum(case when turns < 1.0 THEN total ELSE 0 END ) lessThanOne,
        sum(case when turns >= 1.0 THEN total ELSE 0 END) greaterThanOrEqualToOne,
        sum(total) total
            from (
                select 
                    onHandQty*sct_cst_tot total, 
                    CAST(case when onHandQty*sct_cst_tot > 0 THEN ((in_avg_iss*sct_cst_tot)/(onHandQty*sct_cst_tot))*365 ELSE 0 END AS DECIMAL(16,1)) turns,
                    case when (
                        RIGHT(a.pt_part, 1) != 'U' AND RIGHT(a.pt_part, 1) != 'R' AND RIGHT(a.pt_part, 1) != 'N' 
                    ) THEN '-' ELSE 'COI' END is_coi
            from pt_mstr a
            left join (
                    select in_part, 
                       max(in_avg_iss) in_avg_iss
                    from in_mstr 
                    where in_domain = 'EYE' 
                    and in_site = 'EYE01'
                    group by in_part
                ) b ON b.in_part = a.pt_part 
                
                LEFT JOIN ( 
                    select sct_part 
                        , max(sct_cst_tot) sct_cst_tot 
                    from sct_det 
                    WHERE sct_sim = 'Standard' 
                        and sct_domain = 'EYE'
                        and sct_site  = 'EYE01'
                    group by sct_part 
                ) d ON CAST(a.pt_part AS CHAR(25)) = d.sct_part  

                JOIN (
                    select a.ld_part
                        , sum(ld_qty_oh) onHandQty
                    from ld_det a 
                    where a.ld_domain = 'EYE' 
                    and a.ld_site = 'EYE01'
                    and a.ld_qty_oh > 0
                    GROUP BY a.ld_part
                    
                ) c ON c.ld_part = a.pt_part

            where pt_domain = 'EYE'
           ) a
           where is_coi <> 'COI'
        ";
        //add item type -> Graphics
        $stmt = $this->dbQad->prepare($qry);
        $stmt->execute(); 	
        $result = $stmt->fetch(PDO::FETCH_ASSOC); 	
        return $result;
    }

    
    public function fgLV()
    {
        
        $qry = "
           select sum(case when turns < 1.0 THEN total ELSE 0 END ) lessThanOne,
           sum(case when turns >= 1.0 THEN total ELSE 0 END) greaterThanOrEqualToOne,
           sum(total) total
            from (
                select 
                    onHandQty*sct_cst_tot total, 
                    case when onHandQty*sct_cst_tot > 0 THEN ((in_avg_iss*sct_cst_tot)/(onHandQty*sct_cst_tot))*365 ELSE 0 END turns,
                    
                    case when (
						RIGHT(a.pt_part, 1) != 'U' AND RIGHT(a.pt_part, 1) != 'R' AND RIGHT(a.pt_part, 1) != 'N' 
					) THEN '-' ELSE 'COI' END is_coi
                    
            from pt_mstr a
            left join (
                    select in_part, 
                       max(in_avg_iss) in_avg_iss
                    from in_mstr 
                    where in_domain = 'EYE'
                    and in_site = 'EYE01' 
                    group by in_part
                ) b ON b.in_part = a.pt_part 
                
                LEFT JOIN ( 
                    select sct_part 
                        , max(sct_cst_tot) sct_cst_tot 
                    from sct_det 
                    WHERE sct_sim = 'Standard' 
                        and sct_domain = 'EYE'
						and sct_site  = 'EYE01'
                    group by sct_part 
                ) d ON CAST(a.pt_part AS CHAR(25)) = d.sct_part  

				JOIN (
					select a.ld_part
						, sum(ld_qty_oh) onHandQty
					from ld_det a 
					JOIN ( 
						select loc_loc
						from loc_mstr 
						WHERE loc_domain = 'EYE'  
						and loc_type = 'FG'
						group by loc_loc 
					) cc ON cc.loc_loc = a.ld_loc 
					where a.ld_domain = 'EYE' 
					and a.ld_qty_oh > 0
					GROUP BY a.ld_part
				) c ON c.ld_part = a.pt_part

            where pt_domain = 'EYE' 
            
           ) a
           where is_coi <> 'COI'
        ";
        //add item type -> Graphics
        $stmt = $this->dbQad->prepare($qry);
        $stmt->execute(); 	
        $result = $stmt->fetch(PDO::FETCH_ASSOC); 	
        return $result;
    }

    public function ss()
    {
        
        $qry = "
           select 
           sum(CAST(total AS DECIMAL(16,2) )) total
            from (
                select 
                    onHandQty*sct_cst_tot total,
                    
                    case when (
						RIGHT(a.pt_part, 1) != 'U' AND RIGHT(a.pt_part, 1) != 'R' AND RIGHT(a.pt_part, 1) != 'N' 
					) THEN '-' ELSE 'COI' END is_coi
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

                JOIN (
                    select a.ld_part
                        , sum(ld_qty_oh) onHandQty
                    from ld_det a 
                    JOIN ( 
						select loc_loc
						from loc_mstr 
						WHERE loc_domain = 'EYE'  and loc_type = 'SS'
						group by loc_loc 
					) cc ON cc.loc_loc = a.ld_loc 

                    where a.ld_domain = 'EYE' 
                    and a.ld_qty_oh > 0
                    GROUP BY a.ld_part
                    
                ) c ON c.ld_part = a.pt_part

            where pt_domain = 'EYE'

           ) a
           where is_coi <> 'COI'
        ";
        //add item type -> Graphics
        $stmt = $this->dbQad->prepare($qry);
        $stmt->execute(); 	
        $result = $stmt->fetch(PDO::FETCH_ASSOC); 	
        return $result;
    }

    public function getTransitInfo(){
        $qry = "
            select 
                sum(a.ld_qty_oh*d.sct_cst_tot) total_ext_cost
            from ld_det a
            LEFT JOIN ( 
                select sct_part 
                    , max(sct_cst_tot) sct_cst_tot 
                from sct_det 
                WHERE sct_sim = 'Standard' 
                    and sct_domain = '".$this->domain."'  
                    and sct_site  = 'EYE01' 
                group by sct_part 
            ) d ON a.ld_part = d.sct_part  
            where a.ld_loc = 'TRANSIT'
                AND ld_domain = '".$this->domain."'
            ORDER BY a.ld_qty_oh*d.sct_cst_tot DESC
        ";
        $query = $this->dbQad->prepare($qry);
        $query->execute();
        return $query->fetch(PDO::FETCH_ASSOC);
    }


    
    public function getop20dueAndOverdue()
    {

        $mainQry = "
        select *
    from ( select wr_nbr wr_nbr
        , a.wr_qty_ord - a.wr_qty_comp openQty
        , dueBy dueBy
        , a.wr_part wr_part
        , a.wr_qty_ord
        , a.wr_qty_comp
        , op_qty_comp
        , op_tran_date
        , op_qty_comp_backflush
        , wr_status
        , case when wo_status = 'C' OR a.wr_qty_ord - a.wr_qty_comp = 0 THEN 1 ELSE 0 END complete_status
    from 
        ( 
            select a.wr_nbr, 
                a.wr_op, 
                a.wr_qty_ord, 
                a.wr_qty_wip,  
                a.wr_qty_comp, 
                a.wr_status, 
                a.wr_due, 
                a.wr_part, 
                a.wr_queue, 
                a.wr_qty_inque,
                CASE  
                    WHEN b.wo_so_job = 'dropin' 
                        THEN wr_due
                    ELSE 
                        CASE 
                            WHEN a.wr_op = 10
                                THEN 
                                    CASE 
                                        WHEN DAYOFWEEK ( wr_due ) IN (1)
                                            THEN wr_due - 4
                                            WHEN DAYOFWEEK ( wr_due ) IN (2)
                                                THEN wr_due - 4
                                                WHEN DAYOFWEEK ( wr_due ) IN (3)
                                                    THEN wr_due - 4
                                                    WHEN DAYOFWEEK ( wr_due ) IN (4)
                                                        THEN wr_due - 2
                                                        WHEN DAYOFWEEK ( wr_due ) IN (5)
                                                            THEN wr_due - 2
                                                            WHEN DAYOFWEEK ( wr_due ) IN (6)
                                                                THEN wr_due - 2
                                                                WHEN DAYOFWEEK ( wr_due ) IN (7)
                                                                    THEN wr_due - 3
                                        ELSE wr_due - 2
                            END 
                            WHEN a.wr_op = 20
                                THEN 
                                CASE 
                                        WHEN DAYOFWEEK ( wr_due ) IN (1)
                                            THEN wr_due - 3
                                            WHEN DAYOFWEEK ( wr_due ) IN (2)
                                                THEN wr_due - 3
                                                WHEN DAYOFWEEK ( wr_due ) IN (3)
                                                    THEN wr_due - 1
                                                    WHEN DAYOFWEEK ( wr_due ) IN (4)
                                                        THEN wr_due - 1
                                                        WHEN DAYOFWEEK ( wr_due ) IN (5)
                                                            THEN wr_due - 1
                                                            WHEN DAYOFWEEK ( wr_due ) IN (6)
                                                                THEN wr_due - 1
                                                                WHEN DAYOFWEEK ( wr_due ) IN (7)
                                                                    THEN wr_due - 2
                                        ELSE wr_due - 1
                                END 
                            WHEN a.wr_op = 30
                                THEN 
                                CASE 
                                WHEN DAYOFWEEK ( wr_due ) IN (1)
                                    THEN wr_due - 2
                                    WHEN DAYOFWEEK ( wr_due ) IN (2, 3)
                                        THEN wr_due - 0
                                    WHEN DAYOFWEEK ( wr_due ) IN (4)
                                        THEN wr_due - 0
                                    ELSE wr_due - 0
                                END 	
                                else wo_due_date			
                        END 
                END dueBy 
                , d.op_qty_comp
                , d.op_tran_date
                , d.op_qty_comp op_qty_comp_backflush
                , wo_status
            from wr_route a 

            join ( 
                select wo_nbr, wo_so_job, wo_status, wo_due_date
                from wo_mstr 
                where wo_domain = '".$this->domain."' 
            ) b ON b.wo_nbr = a.wr_nbr 
            
            left join (
                select op_wo_nbr, sum(op_qty_comp) op_qty_comp, max(op_tran_date) op_tran_date
                from op_hist 
                where op_wo_op = :operation 
                and op_domain = '".$this->domain."'
                and op_type = 'BACKFLSH'
                group by op_wo_nbr
            ) d ON d.op_wo_nbr = a.wr_nbr 
            where  a.wr_domain = '".$this->domain."' 
                and a.wr_op = :operation1

        ) a
        where dueBy = curDate()
        ) b
        order by dueBy ASC
        ";

        $operation = 20;
        $query = $this->dbQad->prepare($mainQry);
        $query->bindParam(':operation', $operation, PDO::PARAM_STR);
        $query->bindParam(':operation1', $operation, PDO::PARAM_STR);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }


    public function getThreeMonthsRevenue($beginning, $last)
	{
        //get total revenue for next 3 months;
        //$beginning = date("Y-m-d", strtotime(date('m', strtotime('+1 month')).'/01/'.date('Y').' 00:00:00'));
        //$last = date('Y-m-d', strtotime("+3 months", strtotime($beginning)));

        

		$mainQry = "
			select sum(a.sod_price*(a.sod_qty_ord-a.sod_qty_ship)) value
			from sod_det a
				join (
				    select so_nbr	
				    from so_mstr
				    where so_domain = 'EYE'
				        AND so_compl_date IS NULL
			) c ON c.so_nbr = a.sod_nbr
				WHERE sod_domain = 'EYE'
                    AND sod_project = ''
					AND sod_qty_ord != sod_qty_ship 
                    AND sod_part != 'DISCOUNT'
                and a.sod_per_date between :beginning and :last
				
		";
        
        $operation = 20;
        $query = $this->dbQad->prepare($mainQry);
        $query->bindParam(':beginning', $beginning, PDO::PARAM_STR);
        $query->bindParam(':last', $last, PDO::PARAM_STR);
        $query->execute();
        return $query->fetch(PDO::FETCH_ASSOC);

    }

    public function run()
    {

        $production = $this->productionOrders(20);
        $shipping = $this->shippingReport();
        $totalInventory = $this->totalInventory();
        $getWip =  $this->getWip();
        $getTransit = $this->getTransitInfo();
        $getIntgrtd = $this->getJiaxing('INTGRTD');
        $REJECT = $this->getJiaxing('REJECT');
        $onTime = $this->onTime();

        $total_value_shipped_today = 0;
        $total_shipped_today = 0;
        $shipped_before_or_on_due_date = 0;

        foreach($onTime as $row){
            $total_value_shipped_today += $row['total_value_shipped_today'];
            $total_shipped_today += $row['total_shipped_today'];
            $shipped_before_or_on_due_date += $row['shipped_before_or_on_due_date'];
        }

        $_fgLV = $this->fgLV();
        $_rmlv = $this->rmlv();
        $_jx01 = $this->jx01();
        $_all = $this->all();
        $_ss = $this->ss();
        $totalInventory = $this->totalInventory();

        
        $beginning = date('Y-m-d', strtotime('first day of next month'));
        $last = date('Y-m-d', strtotime('last day of +3 month'));

        $getThreeMonthsRevenue = $this->getThreeMonthsRevenue($beginning, $last);
        

        return array(
            "status" => "Live Report",
            "beginning" => $beginning,
            "last" => $last,
            "last_refreshed" => $this->nowDateTime,
            "wip" => ($getWip['wo_wip_tot']),
            "inventory_value" => ($totalInventory['sum_count']),
            "shipping_open_overdue_and_due_today_lines" => $shipping['open_total_lines'],
            "shipping_open_overdue_and_due_today_value" => $shipping['total_lines_overdue_value'],
            "shipping_total_shipped_value" => $total_value_shipped_today,
            "total_shipped_today_lines" => $total_shipped_today,
            "percent_plan_overall_completed" => $shipping['percent_plan_overall_completed'],
            "total_open" => $shipping['total_open'],
            "value_percentage_today_completed" => $shipping['value_percentage_today_completed'],
            "total_open_value_today" => $shipping['total_open_value_today'],
            "on_time_delivery_today" => $shipped_before_or_on_due_date,
            "on_time_delivery_today_percent" => $total_shipped_today > 0 ? ($shipped_before_or_on_due_date/$total_shipped_today)*100 : 0,
            "total_lines_due_today" => $total_shipped_today,
            "total_open_value" => $shipping['total_open_value'],
            "transit_total_ext_cost" => $getTransit['total_ext_cost'],
            "intgrtd_total_ext_cost" => $getIntgrtd['total_ext_cost'],
            "reject_total_ext_cost" => $REJECT['total_ext_cost'],
            "onTime" => $onTime,
            "eye01" => $_rmlv,
            "jx01" => $_jx01,
            "all" => $_all,
            "fgLV" => $_fgLV,
            "ss" => $_ss,
            "getThreeMonthsRevenue" => $getThreeMonthsRevenue,
            "shippingInfo" => array(
                "shipping_open_overdue_and_due_today_lines" => $shipping['open_total_lines'],
                "shipping_open_overdue_and_due_today_value" => $shipping['total_lines_overdue_value'],
                "min_date" => $shipping['min_date'],
                "max_date" => $shipping['max_date'],
            ),
            
            "production" => array(
                "production_routing_20" => array(
                    "due" => array(
                        "due_open" => $production['due_today_not_completed'],
                        "due_completed_today" => $production['completed_before_or_on_due_date'],
                        "due_total" => $production['today_count'],
                        "total_overdue_orders" => $production['total_overdue_orders'],
                        "due_percent" => $production['today_count'] > 0 ? ($production['completed_before_or_on_due_date'] / $production['today_count']) * 100 : 0
                    )
                ),
            ),
            "scheduledJobs" => (isset($_GET['insert']) && $_GET['insert'] == 1) ? [] : $this->getScheduledJobs()
        );
    }

    public function getScheduledJobs(){
        $qry = "
            select * 
            from  eyefidb.dailyReport
            order by createdDate DESC
            limit 1
        ";
        $query = $this->db->prepare($qry);
        $query->execute();
        $results =  $query->fetchAll(PDO::FETCH_ASSOC);

        foreach($results as &$row){
            $row['data'] = json_decode($row['data'],true);
        }

        return $results;
    }

    
    public function scheduledJob(){

        $data = $this->run();
        $newJson = json_encode($data);

        try {
            $qry = '
                INSERT INTO eyefidb.dailyReport (
                    data
                ) VALUES ( 
                    :data
                )
            ';
            $stmt = $this->db->prepare($qry);
            $stmt->bindParam(':data', $newJson, PDO::PARAM_STR);

            $stmt->execute();
            return $this->db->lastInsertId();
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }
}


// $jsonText = json_encode($results);
// echo Foo::jsonToDebug($jsonText);

//echo json_encode($results, JSON_PRETTY_PRINT | JSON_NUMERIC_CHECK);
