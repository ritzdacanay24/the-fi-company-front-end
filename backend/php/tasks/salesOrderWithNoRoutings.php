<?php

class test
{

    protected $db;

    public function __construct($dbQad, $db)
    {
        $this->db = $dbQad;
    }

    public function getShippingInfo()
    {
        try {
            $mainQry = "
                select a.sod_nbr sod_nbr
                , a.sod_line sod_line
                    , a.sod_due_date sod_due_date
                    , a.sod_part sod_part
                    , a.sod_qty_ord sod_qty_ord
                    , a.sod_contr_id sod_contr_id
                    , a.sod_qty_ord-a.sod_qty_ship qtyOpen
                    , CASE 
                        WHEN b.pt_part IS NULL 
                            THEN a.sod_desc
                        ELSE b.fullDesc
                    END fullDesc
                    , c.so_cust so_cust
                    , sod_order_category sod_order_category
                    , case when wr_part IS NOT NULL OR wr_part = ''  THEN 1 ELSE 0 END routing_found
                    , wr_part
                    , pt_prod_line 
                from sod_det a
                
                left join (
                    select pt_part							
                        , max(CONCAT(pt_desc1, pt_desc2)) fullDesc
                        , max(pt_routing) pt_routing
                    from pt_mstr
                    where pt_domain = 'EYE'
                    group by pt_part		
                ) b ON b.pt_part = a.sod_part
                
                left join (
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
                ) c ON c.so_nbr = a.sod_nbr
                
                LEFT JOIN (
                    select a.ld_part
                        , sum(a.ld_qty_oh) ld_qty_oh
                    from ld_det a
                    JOIN loc_mstr b ON b.loc_loc = a.ld_loc 
                        AND b.loc_type = 'FG' 
                        AND loc_domain = 'EYE'
                    WHERE a.ld_domain = 'EYE'
                        AND ld_status != 'UA'
                    GROUP BY a.ld_part
                ) e ON e.ld_part = a.sod_part
                
                LEFT JOIN (
                    select cmt_cmmt
                        , cmt_indx
                    from cmt_det 
                    where cmt_domain = 'EYE' 
                ) f ON f.cmt_indx = a.sod_cmtindx
                    
                left join (
                    select wr_part					
                    from wr_route
                    where wr_domain = 'EYE'
                    and wr_qty_ord != wr_qty_comp
                    group by wr_part		
                ) w ON w.wr_part = a.sod_part

                LEFT JOIN ( 
                    select pt_part
                        , max(pt_desc1) pt_desc1
                        , max(pt_um) pt_um
                        , max(pt_pm_code) pt_pm_code 
                        , max(pt_prod_line) pt_prod_line
                    from pt_mstr
                    WHERE pt_domain = 'EYE'
                    AND pt_prod_line = '014'
                    group by pt_part
                ) aa ON aa.pt_part = a.sod_part


                WHERE sod_domain = 'EYE'
                    AND sod_qty_ord != sod_qty_ship	
                    AND so_compl_date IS NULL
                    AND case when wr_part IS NOT NULL OR wr_part = '' THEN 1 ELSE 0 END = 0
                    AND sod_order_category NOT IN ('BLANKET', 'JIT')
                    AND SOD_CONTR_ID != 'MATERIAL TRANSFER'
                    AND SOD_PART != 'EXPEDITE'
                ORDER BY a.sod_due_date ASC 
                WITH (NOLOCK)
            ";
            $query = $this->db->prepare($mainQry);
            $query->execute();
            $result = $query->fetchAll(PDO::FETCH_ASSOC);

            return $result;
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }
}

use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Databases\DatabaseQad;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();

$productionInstance = new test($dbQad, $db);

$results = $productionInstance->getShippingInfo();

echo $db_connect->jsonToTable($results);
