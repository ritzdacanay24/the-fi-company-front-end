<?php


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


    public function shippingReport()
    {

        $mainQry = "
                select overdue_open
                    , due_open
                    , future_open
                    , overdue_open_val
                    , due_open_val
                    , future_open_val
                    , total_open_val
                    , overdue_shipped
                    , due_shipped
                    , future_shipped
                    , shipped_today_total
                    , overdue_shipped_val
                    , due_shipped_val
                    , future_shipped_val
                    , total_shipped_val
                    , overdue_open+overdue_shipped overdue_total
                    , due_total
                    , future_open+future_shipped future_total

                    , overdue_open_val+overdue_shipped_val overdue_total_val
                    , due_open_val+due_shipped_val due_total_val
                    , future_open_val+future_shipped_val future_total_val
                    , (overdue_open_val+overdue_shipped_val) + (due_open_val+due_shipped_val) + (future_open_val+future_shipped_val) total_val

                    , on_time_delivery_today
                    , case when (due_open+due_shipped) > 0 THEN (on_time_delivery_today/(due_open+due_shipped))*100 ELSE 0 END on_time_delivery_today_percent
                    
                    , CASE WHEN (due_open_val+due_shipped_val) > 0 THEN (due_shipped_val/(due_open_val+due_shipped_val))*100 ELSE 0 END value_percentage_today_completed
                    , overdue_shipped_partial
                    , due_shipped_partial
                    , future_shipped_partial

                    , total_open
                    , case when total_open > 0 THEN (shipped_today_total / total_open ) * 100 ELSE 0 END percent_plan_overall_completed


                    
                from ( 
                    select 
                    
                        SUM(case when a.sod_due_date = '".$this->nowDate."' THEN 1 ELSE 0 END) due_total,

                        SUM(case when a.sod_due_date < '".$this->nowDate."' AND sod_qty_ord != sod_qty_ship AND c.so_compl_date IS NULL THEN 1 ELSE 0 END) overdue_open,
                        SUM(case when a.sod_due_date = '".$this->nowDate."' AND sod_qty_ord != sod_qty_ship AND c.so_compl_date IS NULL THEN 1 ELSE 0 END) due_open,
                        SUM(case when a.sod_due_date > '".$this->nowDate."' AND sod_qty_ord != sod_qty_ship AND c.so_compl_date IS NULL THEN 1 ELSE 0 END) future_open,
                        sum(case when sod_qty_ord != sod_qty_ship AND c.so_compl_date IS NULL THEN 1 ELSE 0 END) total_open,

                        sum(case when a.sod_due_date < '".$this->nowDate."' AND c.so_compl_date IS NULL THEN sod_list_pr*(sod_qty_ord - sod_qty_ship) ELSE 0 END ) overdue_open_val,
                        sum(case when a.sod_due_date = '".$this->nowDate."' AND c.so_compl_date IS NULL THEN sod_list_pr*(sod_qty_ord - sod_qty_ship) ELSE 0 END ) due_open_val,
                        sum(case when a.sod_due_date > '".$this->nowDate."' AND c.so_compl_date IS NULL THEN sod_list_pr*(sod_qty_ord - sod_qty_ship) ELSE 0 END ) future_open_val,
                        sum(sod_list_pr*(sod_qty_ord - sod_qty_ship)) total_open_val,

                        sum(case when a.sod_due_date < f.abs_shp_date THEN 1 ELSE 0 END ) overdue_shipped, 
                        sum(case when a.sod_due_date = '".$this->nowDate."' AND sod_qty_ord = sod_qty_ship THEN 1 ELSE 0 END ) due_shipped,  
                        sum(case when a.sod_due_date > f.abs_shp_date THEN 1 ELSE 0 END ) future_shipped, 
                        count(f.abs_shp_date) shipped_today_total, 
        
                        sum(case when a.sod_due_date < '".$this->nowDate."' THEN sod_list_pr*f.abs_ship_qty ELSE 0 END ) overdue_shipped_val,
                        sum(case when a.sod_due_date = '".$this->nowDate."'  AND c.so_compl_date IS NULL THEN sod_list_pr*f.abs_ship_qty ELSE 0 END ) due_shipped_val, 
                        sum(case when a.sod_due_date > '".$this->nowDate."' THEN sod_list_pr*f.abs_ship_qty ELSE 0 END ) future_shipped_val, 
                        sum(sod_list_pr*f.abs_ship_qty) total_shipped_val,

                        sum(case when  a.sod_due_date = '".$this->nowDate."' AND g.abs_shp_date <= '".$this->nowDate."'  THEN 1 ELSE 0 END ) on_time_delivery_today,

                        sum(case when sod_qty_ord - sod_qty_ship > 0 AND a.sod_due_date < f.abs_shp_date THEN 1 ELSE 0 END ) overdue_shipped_partial,
                        sum(case when sod_qty_ord - sod_qty_ship > 0 AND a.sod_due_date = f.abs_shp_date THEN 1 ELSE 0 END ) due_shipped_partial,
                        sum(case when sod_qty_ord - sod_qty_ship > 0 AND a.sod_due_date > f.abs_shp_date THEN 1 ELSE 0 END ) future_shipped_partial
                    from sod_det a

                    left join (
                        select so_nbr, so_compl_date
                        from so_mstr
                        where so_domain = 'EYE'
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
                        and abs_shp_date = '".$this->nowDate."'
				        and abs_ship_qty > 0
                        GROUP BY abs_shipto
                            , abs_shp_date
                            , abs_item
                            , abs_line
                            , abs_inv_nbr
                            , abs_par_id
                            , abs_order
                    ) f ON f.abs_order = a.sod_nbr
                        AND f.abs_line = a.sod_line
                        
                        LEFT join (
                            select abs_line
                                , sum(abs_ship_qty) abs_ship_qty
                                , abs_order
                                , max(abs_shp_date) abs_shp_date
                            from abs_mstr 
                            where abs_domain = 'EYE'
                            and abs_ship_qty > 0
                            GROUP BY  abs_line
                                , abs_order
                        ) g ON g.abs_order = a.sod_nbr
                            AND g.abs_line = a.sod_line
                        

                    WHERE sod_domain = 'EYE' AND sod_type != 'M'
                        
                ) a 
                WITH (NOLOCK)
            ";
        $query = $this->dbQad->prepare($mainQry);
        $query->execute();
        return $query->fetch(PDO::FETCH_ASSOC);
    }


    public function shippingReporttest()
    {

        $mainQry = "
                select overdue_open
                    , due_open
                    , future_open
                    , overdue_open_val
                    , due_open_val
                    , future_open_val
                    , total_open_val
                    , overdue_shipped
                    , due_shipped
                    , future_shipped
                    , shipped_today_total
                    , overdue_shipped_val
                    , due_shipped_val
                    , future_shipped_val
                    , total_shipped_val
                    , overdue_open+overdue_shipped overdue_total
                    , due_total
                    , future_open+future_shipped future_total

                    , overdue_open_val+overdue_shipped_val overdue_total_val
                    , due_open_val+due_shipped_val due_total_val
                    , future_open_val+future_shipped_val future_total_val
                    , (overdue_open_val+overdue_shipped_val) + (due_open_val+due_shipped_val) + (future_open_val+future_shipped_val) total_val

                    , on_time_delivery_today
                    , case when (due_open+due_shipped) > 0 THEN (on_time_delivery_today/(due_open+due_shipped))*100 ELSE 0 END on_time_delivery_today_percent
                    
                    , CASE WHEN (due_open_val+due_shipped_val) > 0 THEN (due_shipped_val/(due_open_val+due_shipped_val))*100 ELSE 0 END value_percentage_today_completed
                    , overdue_shipped_partial
                    , due_shipped_partial
                    , future_shipped_partial

                    , total_open
                    , case when total_open > 0 THEN (shipped_today_total / total_open ) * 100 ELSE 0 END percent_plan_overall_completed


                    
                from ( 
                    select 
                    
                        SUM(case when a.sod_due_date = '".$this->nowDate."' THEN 1 ELSE 0 END) due_total,

                        SUM(case when a.sod_due_date < '".$this->nowDate."' AND sod_qty_ord != sod_qty_ship THEN 1 ELSE 0 END) overdue_open,
                        SUM(case when a.sod_due_date = '".$this->nowDate."' AND sod_qty_ord != sod_qty_ship THEN 1 ELSE 0 END) due_open,
                        SUM(case when a.sod_due_date > '".$this->nowDate."' AND sod_qty_ord != sod_qty_ship THEN 1 ELSE 0 END) future_open,
                        sum(case when sod_qty_ord != sod_qty_ship THEN 1 ELSE 0 END) total_open,

                        sum(case when a.sod_due_date < '".$this->nowDate."' THEN sod_list_pr*(sod_qty_ord - sod_qty_ship) ELSE 0 END ) overdue_open_val,
                        sum(case when a.sod_due_date = '".$this->nowDate."' THEN sod_list_pr*(sod_qty_ord - sod_qty_ship) ELSE 0 END ) due_open_val,
                        sum(case when a.sod_due_date > '".$this->nowDate."' THEN sod_list_pr*(sod_qty_ord - sod_qty_ship) ELSE 0 END ) future_open_val,
                        sum(sod_list_pr*(sod_qty_ord - sod_qty_ship)) total_open_val,

                        sum(case when a.sod_due_date < f.abs_shp_date THEN 1 ELSE 0 END ) overdue_shipped, 
                        sum(case when a.sod_due_date = '".$this->nowDate."' AND sod_qty_ord = sod_qty_ship THEN 1 ELSE 0 END ) due_shipped,  
                        sum(case when a.sod_due_date > f.abs_shp_date THEN 1 ELSE 0 END ) future_shipped, 
                        count(f.abs_shp_date) shipped_today_total, 
        
                        sum(case when a.sod_due_date < '".$this->nowDate."' THEN sod_list_pr*f.abs_ship_qty ELSE 0 END ) overdue_shipped_val,
                        sum(case when a.sod_due_date = '".$this->nowDate."' THEN sod_list_pr*f.abs_ship_qty ELSE 0 END ) due_shipped_val, 
                        sum(case when a.sod_due_date > '".$this->nowDate."' THEN sod_list_pr*f.abs_ship_qty ELSE 0 END ) future_shipped_val, 
                        sum(sod_list_pr*f.abs_ship_qty) total_shipped_val,

                        sum(case when a.sod_due_date = '".$this->nowDate."'  AND sod_qty_ord = sod_qty_ship AND a.sod_due_date >= f.abs_shp_date THEN 1 ELSE 0 END ) on_time_delivery_today,

                        sum(case when sod_qty_ord - sod_qty_ship > 0 AND a.sod_due_date < f.abs_shp_date THEN 1 ELSE 0 END ) overdue_shipped_partial,
                        sum(case when sod_qty_ord - sod_qty_ship > 0 AND a.sod_due_date = f.abs_shp_date THEN 1 ELSE 0 END ) due_shipped_partial,
                        sum(case when sod_qty_ord - sod_qty_ship > 0 AND a.sod_due_date > f.abs_shp_date THEN 1 ELSE 0 END ) future_shipped_partial
                    from sod_det a

                    left join (
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
				        and abs_ship_qty > 0
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

    public function getWip()
    {

        $mainQry = "
            select sum(wo_wip_tot) wo_wip_tot 
            from wo_mstr  
            where wo_domain = 'EYE' 
            and wo_status != 'C'  
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
            select total_open
                , overdue_open
                , due_open
                , future_open
                , overdue_completed_today
                , due_completed_today
                , future_completed_today
                , total_completed_today

                , overdue_open + overdue_completed_today overdue_total
                , due_open + due_completed_today due_total
                , future_open + future_completed_today future_total
                , total_open + total_completed_today total

                , case when (total_open + total_completed_today) > 0 THEN (total_completed_today / (total_open + total_completed_today) ) * 100 ELSE 0 END percent_plan_overall_completed
                , case when (due_open + due_completed_today) > 0 THEN (due_completed_today / (due_open + due_completed_today) ) * 100 ELSE 0 END percent_plan_due_completed
                , case when (due_open + due_completed_today) > 0 THEN due_completed_today / (due_open + due_completed_today) ELSE 0 END otd
            from (
                
                select sum(case when wr_op = 10 AND wr_qty_ord != wr_qty_comp THEN 1 WHEN wr_op != 10 AND wr_qty_inque > 0 THEN 1 ELSE 0 END) total_open
                , sum(case when wr_op = 10 AND wr_qty_ord != wr_qty_comp AND due_by < '".$this->nowDate."' THEN 1  when wr_op != 10 AND due_by < '".$this->nowDate."' and wr_qty_inque > 0 THEN 1 ELSE 0 END) overdue_open
                , sum(case when wr_op = 10 AND wr_qty_ord != wr_qty_comp AND due_by = '".$this->nowDate."' THEN 1 when wr_op != 10 AND due_by = '".$this->nowDate."' and wr_qty_inque > 0 THEN 1 ELSE 0 END) due_open
                , sum(case when wr_op = 10 AND wr_qty_ord != wr_qty_comp AND due_by > '".$this->nowDate."' THEN 1 when wr_op != 10 AND due_by > '".$this->nowDate."' and wr_qty_inque > 0 THEN 1 ELSE 0 END) future_open

                , sum(case when op_tran_date < due_by THEN 1 ELSE 0 END) overdue_completed_today
                , sum(case when op_tran_date = due_by THEN 1 ELSE 0 END) due_completed_today
                , sum(case when op_tran_date > due_by THEN 1 ELSE 0 END) future_completed_today


                , count(op_tran_date) total_completed_today
            from (
                select wr_qty_ord, wr_qty_comp, CASE 
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
                            ELSE wr_due
                        END 
                END due_by
                , wr_qty_inque
                , op_tran_date
                , wr_op
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
                        AND op_wo_op = :operation  
                        and op_tran_date = '".$this->nowDate."' 
                        and op_domain = 'EYE'
                ) c ON c.op_wo_nbr = a.wr_nbr

                where wr_op = :operation1
                    and wr_domain = 'EYE' 
            ) a
            ) a
        ";
        $query = $this->dbQad->prepare($mainQry);
        $query->bindParam(':operation', $operation, PDO::PARAM_STR);
        $query->bindParam(':operation1', $operation, PDO::PARAM_STR);
        $query->execute();
        return $query->fetch(PDO::FETCH_ASSOC);
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

    public function productionRouteCompleted()
    {

        $mainQry = "select count(*) hits 
        from op_hist  
        where op_domain = 'EYE' and op_type = 'OP-CLOSE'  and op_tran_date = '".$this->nowDate."' and op_wo_op = 20
        ";
        $stmt = $this->dbQad->prepare($mainQry);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function shippingChangesReport1()
    {

        $shipTo = "
            select data
            from eyefidb.shipping_changes 
            where date(created_date) = '".$this->nowDate."'
        ";
        $query = $this->db->prepare($shipTo);
        $query->execute();
        $results = $query->fetch(PDO::FETCH_ASSOC);

        $d = $changes = json_decode($results['data']);


        $mainQry = "
            select a.sod_nbr sod_nbr
                , a.sod_due_date sod_due_date
                , a.sod_line
            from sod_det a
            
            join (
                select so_nbr	
                    , so_cust
                    , so_ord_date
                    , so_ship
                    , so_bol
                    , so_cmtindx
                    , so_compl_date
                    , so_shipvia
                from so_mstr
                where so_domain = 'EYE'
                AND so_compl_date IS NULL
            ) c ON c.so_nbr = a.sod_nbr
            
            WHERE sod_domain = 'EYE'
                AND sod_qty_ord != sod_qty_ship	
                
            ORDER BY a.sod_due_date ASC 
            WITH (NOLOCK)
        ";
        $query = $this->dbQad->prepare($mainQry);
        $query->execute();
        $open = $query->fetchAll(PDO::FETCH_ASSOC);


        $l = [];

        $overDueChanges = 0;
        $dueChanges = 0;
        $futureChanges = 0;

        $overDueChanges_add = 0;
        $dueChanges_add = 0;
        $futureChanges_add = 0;

        foreach ($open as $row) {
            $id = $row['sod_nbr'] . '-' . $row['sod_line'];
            foreach ($d as $row1) {
                $id1 = $row1->SOD_NBR . '-' . $row1->SOD_LINE;
                if ($id == $id1) {
                    if ($row['sod_due_date'] != $row1->SOD_DUE_DATE) {
                        if ($this->nowDate > $row1->SOD_DUE_DATE) {
                            $overDueChanges++;
                        }
                        if ($this->nowDate == $row1->SOD_DUE_DATE) {
                            $dueChanges++;
                        }

                        if ($this->nowDate < $row1->SOD_DUE_DATE) {
                            $futureChanges++;
                        }

                        if ($this->nowDate > $row['sod_due_date']) {
                            $overDueChanges_add++;
                        }
                        if ($this->nowDate == $row['sod_due_date']) {
                            $dueChanges_add++;
                        }

                        if ($this->nowDate < $row['sod_due_date']) {
                            $futureChanges_add++;
                        }

                        $l[] = array(
                            "so" => $id,
                            "o" => $row1->SOD_DUE_DATE,
                            "n" => $row['sod_due_date']
                        );
                    }
                }
            }
        }



        return array(
            // "details" => $l,
            "dates_removed" => array(
                "overdue_changes" => $overDueChanges,
                "due_changes" => $dueChanges,
                "future_changes" => $futureChanges
            ),
            "dates_added" => array(
                "overdue_changes" => $overDueChanges_add,
                "due_changes" => $dueChanges_add,
                "future_changes" => $futureChanges_add
            )

        );
    }

    public function totalInventory()
    {
        $mainQry = "
            select cast(SUM(a.ld_qty_oh*c.sct_cst_tot) as numeric(36,2)) sum_count,
                sum(case when c.loc_type = 'FG' THEN a.ld_qty_oh*c.sct_cst_tot ELSE 0 END) fg_sum
            FROM ld_det a 
            LEFT JOIN pt_mstr b ON a.ld_part = b.pt_part AND b.pt_domain = 'EYE' 
            
            LEFT JOIN loc_mstr c ON c.loc_loc = a.ld_loc 
                    AND c.loc_type = 'FG' 
                    AND loc_domain = 'EYE'

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
            WITH (noLock)
        ";
        $query = $this->dbQad->prepare($mainQry);
        $query->execute();
        return $query->fetch(PDO::FETCH_ASSOC);
    }

    public function test()
    {
        $mainQry = "
        select sum(case when dueBy < '".$this->nowDate."' AND a.wr_op = 10 THEN 1 ELSE 0 END) overdue_count10, 
        sum(case when dueBy = '".$this->nowDate."' AND a.wr_op = 10 THEN 1 ELSE 0 END) due_count10, 
        sum(case when dueBy > '".$this->nowDate."' AND a.wr_op = 10 THEN 1 ELSE 0 END) future_count10,
        sum(case when dueBy < '".$this->nowDate."' AND a.wr_op = 20 THEN 1 ELSE 0 END) overdue_count20, 
        sum(case when dueBy = '".$this->nowDate."' AND a.wr_op = 20 THEN 1 ELSE 0 END) due_count20, 
        sum(case when dueBy > '".$this->nowDate."' AND a.wr_op = 20 THEN 1 ELSE 0 END) future_count20,
        sum(case when dueBy < '".$this->nowDate."' AND a.wr_op = 30 THEN 1 ELSE 0 END) overdue_count30, 
        sum(case when dueBy = '".$this->nowDate."' AND a.wr_op = 30 THEN 1 ELSE 0 END) due_count30, 
        sum(case when dueBy > '".$this->nowDate."' AND a.wr_op = 30 THEN 1 ELSE 0 END) future_count30
        from 
        ( select a.wr_nbr, 
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
         END dueBy 
        from wr_route a 
        join ( 
           select wo_nbr, wo_so_job
           from wo_mstr 
           where wo_domain = 'EYE' 
           and wo_status != 'c' 
           and wo_qty_ord	!= wo_qty_comp	 
        ) b ON b.wo_nbr = a.wr_nbr 
        where a.wr_qty_ord != a.wr_qty_comp 
           AND a.wr_status != 'c'  
           and a.wr_domain = 'EYE' and a.wr_op IN (10, 20, 30)
        ) a
        ";
        $query = $this->dbQad->prepare($mainQry);
        $query->execute();
        return $query->fetch(PDO::FETCH_ASSOC);
    }

    public function totalProductionOrders()
    {
        $mainQry = "
        select 
        sum(case when dueBy < '".$this->nowDate."' AND a.op_wo_op = 20 THEN 1 ELSE 0 END) overdue_count20, 
        sum(case when dueBy = '".$this->nowDate."' AND a.op_wo_op = 20 THEN 1 ELSE 0 END) due_count20, 
        sum(case when dueBy > '".$this->nowDate."' AND a.op_wo_op = 20 THEN 1 ELSE 0 END) future_count20
        
        from op_hist a
           
           LEFT join ( 
              select wr_nbr, 
                 CASE  
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
               END dueBy 
              from wr_route a 
           
              LEFT join ( 
                 select wo_nbr, wo_so_job
                 from wo_mstr 
                 where wo_domain = 'EYE'  
              ) b ON b.wo_nbr = wr_nbr 
           
              where wr_domain = 'EYE'
              AND a.wr_op = 20
           ) b ON b.wr_nbr = a.op_wo_nbr 
        
        where a.op_domain = 'EYE'  
           and a.op_type = 'WO-CLOSE'   
           and a.op_tran_date = '".$this->nowDate."'
           and a.op_wo_op = 20
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
                select sum(case when wo_due_date < '".$this->nowDate."' AND wo_status IN ('R', 'F', 'A') THEN 1 ELSE 0 END) overdue_open,  
                    sum(case when wo_due_date = '".$this->nowDate."' AND wo_status IN ('R', 'F', 'A') THEN 1 ELSE 0 END) due_open,  
                    sum(case when wo_due_date > '".$this->nowDate."' AND wo_status IN ('R', 'F', 'A') THEN 1 ELSE 0 END) future_open,  
                    sum(case when wo_status IN ('R', 'F', 'A') THEN 1 ELSE 0 END) total_open,   

                    sum(case when  wo_stat_close_date = '".$this->nowDate."' AND wo_due_date < '".$this->nowDate."' THEN 1 ELSE 0 END) overdue_completed_today,
                    sum(case when wo_status IN ('C') AND wo_stat_close_date = '".$this->nowDate."' AND wo_due_date = '".$this->nowDate."' THEN 1 ELSE 0 END) due_completed_today,
                    sum(case when wo_status IN ('C') AND wo_stat_close_date = '".$this->nowDate."' AND wo_due_date > '".$this->nowDate."' THEN 1 ELSE 0 END) future_completed_today,
                    sum(case when wo_status IN ('C') AND wo_stat_close_date = '".$this->nowDate."' THEN 1 ELSE 0 END) total_completed_today
                from wo_mstr  
                where wo_domain = 'EYE' 
                and wo_status IN ('R', 'F', 'A', 'C') 
            ) a
            WITH (noLock)
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

    public function getProductionInfo()
    {
        try {
            //set to 20 or 30 
            $whatToView = 20;

            if ($whatToView == 30) {
                $nextView = 20;
            } else if ($whatToView == 20) {
                $nextView = 10;
            }

            $mainQry = "
                SELECT a.wr_nbr wr_nbr
                    , a.wr_op wr_op
                    , a.wr_desc wr_desc
                    , a.wr_wkctr wr_wkctr
                    , a.wr_qty_ord wr_qty_ord
                    , a.wr_qty_comp wr_qty_comp
                    , a.wr_due wr_due
                    , a.wr_part wr_part
                    , a.wr_status wr_status
                    , a.wr_qty_ord-a.wr_qty_comp openQty
                    , wo_ord_date wo_ord_date
                    , b.wo_so_job wo_so_job
                    , b.wo_rmks wo_rmks
                    , CASE 
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
                END dueBy
                    , DAYOFWEEK ( wr_due ) dueByTestday
                    , CONCAT(pt_desc1, pt_desc2) fullDesc
                    , b.wo_status
                    , b.wo_rel_date wo_rel_date
                    , REPLACE(CONCAT(a.wr_nbr,TO_CHAR(wr_op)), ' ', '') id 
                    , e.lineStatus
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
                    AND a.wr_op IN (" . $nextView . ")
                ) c ON c.wr_nbr = a.wr_nbr

                
                LEFT JOIN (
                    SELECT a.wr_nbr wr_nbr
                        , a.wr_qty_comp wr_qty_comp
                        , a.wr_qty_ord
                    FROM wr_route a
                    WHERE a.wr_domain = 'EYE'
                    AND a.wr_qty_ord != a.wr_qty_comp
                    AND a.wr_op IN (" . $whatToView . ")
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
                
                WHERE a.wr_domain = 'EYE'
                    AND a.wr_qty_ord != a.wr_qty_comp
                    AND wo_status != 'c'
                    AND WR_STATUS != 'C'
                    AND a.wr_op IN (20)
                    AND CASE 
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
                 END <= CURDATE()
                with (noLock)  
            ";
            $query = $this->dbQad->prepare($mainQry);
            $query->execute();
            return $query->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function run()
    {

        $shipping = $this->shippingReport();
        $productionReal = $this->test();
        $dueDateChanges = $this->shippingChangesReport1();
        $picking = $this->productionOrders(10);
        $production = $this->productionOrders(20);
        $qc = $this->productionOrders(30);
        $graphics = $this->productionOrders(40);
        $graphicsShipment = $this->productionOrders(50);
        $totalInventory = $this->totalInventory();
        $previousData = json_decode($this->getData(), true);
        $totalProductionOrders =  $this->totalProductionOrders();
        $getWip =  $this->getWip();



        $productionRouteCompleted = $this->productionRouteCompleted();

        if (isset($_GET['insert']) && $_GET['insert'] == 1) {
            $this->insert(array(
                "picking" => $picking,
                "production" => $production,
                "qc" => $qc,
                "graphics" => $graphics,
                "graphicsShipment" => $graphicsShipment,
                "shipping" => $shipping,
                "totalInventory" => $totalInventory,
                "totalProductionOrders" => $totalProductionOrders,
                "dueDateChanges" => $dueDateChanges,
            ));
        }

        $productionOverdueComp  = is_null($totalProductionOrders['overdue_count20']) ? 0 : $totalProductionOrders['overdue_count20'];
        $productiondueComp  = is_null($totalProductionOrders['due_count20']) ? 0 : $totalProductionOrders['due_count20'];
        return array(
            "status" => "Live Report",
            "last_refreshed" => $this->nowDateTime,
            "inventory_value" => $this->moneyFormat($totalInventory['sum_count']),
            "finished_goods_inventory_value" => $this->moneyFormat($totalInventory['fg_sum']),
            "wip" => $this->moneyFormat($getWip['wo_wip_tot']),
            "due_date_changes" => $dueDateChanges,
            "shipping" => array(
                "overdue" => array(
                    "overdue_open" => $shipping['overdue_open'],
                    "overdue_shipped" => $shipping['overdue_shipped'],
                    "overdue_total" => $shipping['overdue_total'],
                    "overdue_shipped_partial" => $shipping['overdue_shipped_partial'],
                    "overdue_open_val" => $this->moneyFormat($shipping['overdue_open_val']),
                    "overdue_shipped_val" => $this->moneyFormat($shipping['overdue_shipped_val']),
                    "overdue_total_val" => $this->moneyFormat($shipping['overdue_total_val']),
                ),
                "due" => array(
                    "due_open" => $shipping['due_open'],
                    "due_shipped" => $shipping['due_shipped'],
                    "due_total" => $shipping['due_total'],
                    "due_shipped_partial" => $shipping['due_shipped_partial'],
                    "due_open_val" => $this->moneyFormat($shipping['due_open_val']),
                    "due_shipped_val" => $this->moneyFormat($shipping['due_shipped_val']),
                    "due_total_val" => $this->moneyFormat($shipping['due_total_val'])
                ),
                "future" => array(
                    "future_open" => $shipping['future_open'],
                    "future_shipped" => $shipping['future_shipped'],
                    "future_total" => $shipping['future_total'],
                    "future_shipped_partial" => $shipping['future_shipped_partial'],
                    "future_open_val" => $this->moneyFormat($shipping['future_open_val']),
                    "future_shipped_val" => $this->moneyFormat($shipping['future_shipped_val']),
                    "future_total_val" => $this->moneyFormat($shipping['future_total_val']),
                ),
                "today_shipment_summary" => array(
                    "overdue_shipped" => $shipping['overdue_shipped'],
                    "due_shipped" => $shipping['due_shipped'],
                    "future_shipped" => $shipping['future_shipped'],
                    "shipped_today_total" => $shipping['shipped_today_total'],
                    "total_shipped_val" => $this->moneyFormat($shipping['total_shipped_val']),
                ),
                "summary" => array(
                    "total_open" => $shipping['total_open'],
                    "total_open_val" => $this->moneyFormat($shipping['total_open_val']),
                    "total_shipped_val" => $this->moneyFormat($shipping['total_shipped_val']),
                    "total_val" => $this->moneyFormat($shipping['total_val']),
                    "percent_plan_overall_completed" => $this->nf($shipping['percent_plan_overall_completed']),
                    "value_percentage_today_completed" => $this->nf($shipping['value_percentage_today_completed']),
                    "on_time_delivery" => array(
                        "on_time_delivery_today" => $shipping['on_time_delivery_today'] . " of " . $shipping['due_total'],
                        "on_time_delivery_today_percent" => $this->nf($shipping['on_time_delivery_today_percent']),
                    ),
                ),
                // "this_week" => array(
                //     "total_open_this_week" => $shipping['total_open_this_week'],
                //     "total_shipped_this_week_val" => $shipping['total_shipped_this_week_val'],
                //     "total_open_this_week_val" => $this->moneyFormat($shipping['total_open_this_week_val']),
                //     "total_this_week_val" => $this->moneyFormat($shipping['vv']),
                //     "total_shipped_this_week_val" => $this->moneyFormat($shipping['total_shipped_this_week_val']),
                //     "total_this_week_val" => $this->moneyFormat($shipping['total_this_week_val']),
                // )
            ),

            "production" => array(
                // "production_routing_10" => array(
                //     "overdue" => array(
                //         "overdue_open" => $productionReal['overdue_count10'],
                //         "overdue_completed_today" => $totalProductionOrders['overdue_count10'],
                //         "overdue_total" => $productionReal['overdue_count10']+$totalProductionOrders['overdue_count10']
                //     ),
                //     "due" => array(
                //         "due_open" => $productionReal['due_count10'],
                //         "due_completed_today" => $totalProductionOrders['due_count10'],
                //         "due_total" => $productionReal['due_count10']+$totalProductionOrders['due_count10']
                //     )
                // ),
                "production_routing_20" => array(
                    "overdue" => array(
                        "overdue_open" => $productionReal['overdue_count20'],
                        "overdue_completed_today" => $productionOverdueComp,
                        "overdue_total" => $productionReal['overdue_count20'] + $productionOverdueComp
                    ),
                    "due" => array(
                        "due_open" => $productionReal['due_count20'],
                        "due_completed_today" => $productiondueComp,
                        "due_total" => $productionReal['due_count20'] + $productiondueComp
                    ),
                    // "future" => array(
                    //     "future_open" => $totalProductionOrders['future_open'],
                    //     "future_completed_today" => $totalProductionOrders['future_completed_today'],
                    //     "future_total" => $totalProductionOrders['future_total']
                    // ),
                    "summary" => array(
                        "overdue+due" => ($productionReal['overdue_count20'] + $productionOverdueComp) + ($productionReal['due_count20'] + $productiondueComp),
                        "on_time_delivery" => array(
                            "on_time_delivery_today" => $productiondueComp . " of " . ($productionReal['due_count20'] + $productiondueComp),
                            "on_time_delivery_today_percent" => $productionReal['due_count20'] + $productiondueComp > 0 ? $this->nf(($productiondueComp / $productionReal['due_count20'] + $productiondueComp) * 100) : 0,
                        ),
                    )
                ),
                // "production_routing_30" => array(
                //     "overdue" => array(
                //         "overdue_open" => $productionReal['overdue_count30'],
                //         "overdue_completed_today" => $totalProductionOrders['overdue_count30'],
                //         "overdue_total" => $productionReal['overdue_count30']+$totalProductionOrders['overdue_count30']
                //     ),
                //     "due" => array(
                //         "due_open" => $productionReal['due_count30'],
                //         "due_completed_today" => $totalProductionOrders['due_count30'],
                //         "due_total" => $productionReal['due_count30']+$totalProductionOrders['due_count30']
                //     )
                // ),
                // "routing" => array(
                //     "picking" => array(
                //         "overdue" => array(
                //             "overdue_open" => $picking['overdue_open'],
                //             "overdue_completed_today" => $picking['overdue_completed_today'],
                //             "overdue_total" => $picking['overdue_total']
                //         ),
                //         "due" => array(
                //             "due_open" => $picking['due_open'],
                //             "due_completed_today" => $picking['due_completed_today'],
                //             "due_total" => $picking['due_total']
                //         ),
                //         "future" => array(
                //             "future_open" => $picking['future_open'],
                //             "future_completed_today" => $picking['future_completed_today'],
                //             "future_total" => $picking['future_total']
                //         ),
                //         "summary" => array(
                //             "total_open" => $picking['total_open'],
                //             "total_completed_today" => $picking['total_completed_today'],
                //             "total" => $picking['total'],
                //             "percent_plan_overall_completed" => $this->nf($picking['percent_plan_overall_completed']),
                //             "percent_plan_due_completed" => $this->nf($picking['percent_plan_due_completed']),
                //             "on_time_delivery" => array(
                //                 "on_time_delivery_today" => $picking['due_completed_today'] . " of " . $picking['due_total'],
                //                 "on_time_delivery_today_percent" => $this->nf($picking['otd']),
                //             ),
                //         ),
                //     ),
                //     "production" => array(
                //         "overdue" => array(
                //             "overdue_open" => $production['overdue_open'],
                //             "overdue_completed_today" => $production['overdue_completed_today'],
                //             "overdue_total" => $production['overdue_total']
                //         ),
                //         "due" => array(
                //             "due_open" => $production['due_open'],
                //             "due_completed_today" => $production['due_completed_today'],
                //             "due_total" => $production['due_total']
                //         ),
                //         "future" => array(
                //             "future_open" => $production['future_open'],
                //             "future_completed_today" => $production['future_completed_today'],
                //             "future_total" => $production['future_total']
                //         ),
                //         "summary" => array(
                //             "total_open" => $production['total_open'],
                //             "total_completed_today" => $production['total_completed_today'],
                //             "total" => $production['total'],
                //             "percent_plan_overall_completed" => $this->nf($production['percent_plan_overall_completed']),
                //             "percent_plan_due_completed" => $this->nf($production['percent_plan_due_completed']),
                //             "on_time_delivery" => array(
                //                 "on_time_delivery_today" => $production['due_completed_today'] . " of " . $production['due_total'],
                //                 "on_time_delivery_today_percent" => $this->nf($production['otd']),
                //             ),
                //         ),
                //     ),
                //     "qc" => array(
                //         "overdue" => array(
                //             "overdue_open" => $qc['overdue_open'],
                //             "overdue_completed_today" => $qc['overdue_completed_today'],
                //             "overdue_total" => $qc['overdue_total']
                //         ),
                //         "due" => array(
                //             "due_open" => $qc['due_open'],
                //             "due_completed_today" => $qc['due_completed_today'],
                //             "due_total" => $qc['due_total']
                //         ),
                //         "future" => array(
                //             "future_open" => $qc['future_open'],
                //             "future_completed_today" => $qc['future_completed_today'],
                //             "future_total" => $qc['future_total']
                //         ),
                //         "summary" => array(
                //             "total_open" => $qc['total_open'],
                //             "total_completed_today" => $qc['total_completed_today'],
                //             "total" => $qc['total'],
                //             "percent_plan_overall_completed" => $this->nf($qc['percent_plan_overall_completed']),
                //             "percent_plan_due_completed" => $this->nf($qc['percent_plan_due_completed']),
                //             "on_time_delivery" => array(
                //                 "on_time_delivery_today" => $qc['due_completed_today'] . " of " . $qc['due_total'],
                //                 "on_time_delivery_today_percent" => $this->nf($qc['otd']),
                //             ),
                //         ),
                //     ),
                //     "graphics_stock" => array(
                //         "overdue" => array(
                //             "overdue_open" => $graphics['overdue_open'],
                //             "overdue_completed_today" => $graphics['overdue_completed_today'],
                //             "overdue_total" => $graphics['overdue_total']
                //         ),
                //         "due" => array(
                //             "due_open" => $graphics['due_open'],
                //             "due_completed_today" => $graphics['due_completed_today'],
                //             "due_total" => $graphics['due_total']
                //         ),
                //         "future" => array(
                //             "future_open" => $graphics['future_open'],
                //             "future_completed_today" => $graphics['future_completed_today'],
                //             "future_total" => $graphics['future_total']
                //         ),
                //         "summary" => array(
                //             "total_open" => $graphics['total_open'],
                //             "total_completed_today" => $graphics['total_completed_today'],
                //             "total" => $graphics['total'],
                //             "percent_plan_overall_completed" => $this->nf($graphics['percent_plan_overall_completed']),
                //             "percent_plan_due_completed" => $this->nf($graphics['percent_plan_due_completed']),
                //             "on_time_delivery" => array(
                //                 "on_time_delivery_today" => $graphics['due_completed_today'] . " of " . $graphics['due_total'],
                //                 "on_time_delivery_today_percent" => $this->nf($graphics['otd']),
                //             ),
                //         ),
                //     ),
                //     "graphics_pack_for_shipment" => array(
                //         "overdue" => array(
                //             "overdue_open" => $graphicsShipment['overdue_open'],
                //             "overdue_completed_today" => $graphicsShipment['overdue_completed_today'],
                //             "overdue_total" => $graphicsShipment['overdue_total']
                //         ),
                //         "due" => array(
                //             "due_open" => $graphicsShipment['due_open'],
                //             "due_completed_today" => $graphicsShipment['due_completed_today'],
                //             "due_total" => $graphicsShipment['due_total']
                //         ),
                //         "future" => array(
                //             "future_open" => $graphicsShipment['future_open'],
                //             "future_completed_today" => $graphicsShipment['future_completed_today'],
                //             "future_total" => $graphicsShipment['future_total']
                //         ),
                //         "summary" => array(
                //             "total_open" => $graphicsShipment['total_open'],
                //             "total_completed_today" => $graphicsShipment['total_completed_today'],
                //             "total" => $graphicsShipment['total'],
                //             "percent_plan_overall_completed" => $this->nf($graphicsShipment['percent_plan_overall_completed']),
                //             "percent_plan_due_completed" => $this->nf($graphicsShipment['percent_plan_due_completed']),
                //             "on_time_delivery" => array(
                //                 "on_time_delivery_today" => $graphicsShipment['due_completed_today'] . " of " . $graphicsShipment['due_total'],
                //                 "on_time_delivery_today_percent" => $this->nf($graphicsShipment['otd']),
                //             ),
                //         ),
                //     ),
                //),
            ),
            // "prod_details" => $production
            // "previousData" => $previousData,
            // "shipping_details" => $shipping,
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
                    "total_open" => $shipping['PAST_DUE_LINES'],
                    "value_6am_snapshot" => $this->moneyFormat($metrics['shipping_overdue_amount_6am']),
                    "value" => $this->moneyFormat($shipping['VALUE_PAST_DUE']),
                ),
                "due_today" => array(
                    "total_lines_6am_snapshot" => $metrics['shipping_lines_due_6am'],
                    "total_this_week" => $shipping['LINES_DUE_AT_START_OF_THE_DAY'],
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
                    "shipped_today_total" => $onTimeShipmentReport['TOTAL_SHIPPED_TODAY'],
                    "value_shipped_today" => $this->moneyFormat($onTimeShipmentReport['TOTAL_SHIP_TODAY_VALUE']),
                ),
                "total_this_week" => $shipping['LINES_DUE'],
            ),
            "production" => array(
                "overdue_lines" => array(
                    "total_6am_snapshot" => $metrics['production_total_wo_lines_overdue_6am'],
                    "total_this_week" => $production['TOTAL_LINES_OVER_DUE'] + $production['TOTAL_LINES_DUE_TODAY']
                ),
                "due_today_lines" => array(
                    "total_6am_snapshot" => $metrics['production_wo_lines_due_today_6am'],
                    "total_this_week" => $production['TOTAL_LINES_DUE_TODAY'],
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
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_LOWER);

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();
$dbQad->setAttribute(PDO::ATTR_CASE, PDO::CASE_LOWER);

$data = new OverallReport($db, $dbQad);

$results = $data->run();

class Foo
{
    public static function jsonToDebug($jsonText = '')
    {
        $arr = json_decode($jsonText, true);
        $html = "<style type='text/css'>
        body{
            padding:5px !important;
            margin:5px !important;
        }

        .center:first-child {
            margin-left: auto;
            margin-right: auto;
          }

        table tr:first-child>th{
            position: sticky;
            top: 0;
        }
        table {
            margin: 0px;
            border-collapse: collapse;
        }
        table, th, td {
            border: 1px solid black;
            padding:3px;
            white-space:normal;
        }
        th {
            font-family: Arial, Helvetica, sans-serif;
            font-size: .75em;
            background: #666;
            color: #FFF;
            padding: 2px 6px;
            border-collapse: separate;
            border: 1px solid #000;
        }
        td {
            font-family: Arial, Helvetica, sans-serif;
            font-size: .75em;
            border: 1px solid #DDD;
        }
    </style>";
        if ($arr && is_array($arr)) {
            $html .= self::_arrayToHtmlTableRecursive($arr);
        }
        return $html;
    }

    private static function _arrayToHtmlTableRecursive($arr)
    {
        $str = "<div class='center1'><table><tbody style='margin-left:0px'>";
        foreach ($arr as $key => $val) {
            $str .= "<tr>";
            $str .= "<td>$key</td>";
            $str .= "<td>";
            if (is_array($val)) {
                if (!empty($val)) {
                    $str .= self::_arrayToHtmlTableRecursive($val);
                }
            } else {
                $str .= "<strong>$val</strong>";
            }
            $str .= "</td></tr>";
        }
        $str .= "</tbody></table></div>";

        return $str;
    }
}


$jsonText = json_encode($results);
echo Foo::jsonToDebug($jsonText);

//echo json_encode($results, JSON_PRETTY_PRINT | JSON_NUMERIC_CHECK);
