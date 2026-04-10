<?php
use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Databases\DatabaseQad;

$dbConnect = new DatabaseEyefi();
$db = $dbConnect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$dbConnectQad = new DatabaseQad();
$dbQad = $dbConnectQad->getConnection();
$dbQad->setAttribute(PDO::ATTR_CASE, PDO::CASE_LOWER);

$mainQry = productionOrders();
$query = $dbQad->prepare($mainQry);
$query->execute();
$results = $query->fetchAll(PDO::FETCH_ASSOC);

$mainQry = "
    select *
    from weekly_users
";

$query = $db->prepare($mainQry);
$query->execute();
$times =  $query->fetchAll(PDO::FETCH_ASSOC);


foreach($results as &$row){
    $row['data'] = new StdClass();
    $row['data']->employees = 11;
    foreach($times as $timesRow){
        if($row['dueby'] == $timesRow['date']){
           $row['data'] = $timesRow;
        }
    } 
}


echo $dbConnect->json_encode($results);

 function productionOrders()
    {
        $mainQry = "
            SELECT sum(qtyOpen) total_qty
                , dueBy
                
            from (
                select a.wr_nbr wr_nbr
                    , a.wr_op wr_op
                    , a.wr_desc wr_desc
                    , a.wr_wkctr wr_wkctr
                    , a.wr_qty_ord wr_qty_ord
                    , a.wr_qty_comp wr_qty_comp
                    , a.wr_due wr_due
                    , a.wr_part wr_part
                    , a.wr_status wr_status
                    , a.wr_qty_ord-a.wr_qty_comp qtyOpen
                    , wo_ord_date wo_ord_date
                    , CASE WHEN b.wo_so_job = 'dropin' THEN 1 ELSE 0 END dropInClass
                    , b.wo_so_job wo_so_job
                    , b.wo_rmks wo_rmks
                    , DAYOFWEEK ( wr_due ) day
                    , CONCAT(pt_desc1, pt_desc2) fullDesc
                    , b.wo_status
                    , b.wo_rel_date wo_rel_date
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
                FROM wr_route a
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
                            AND wo_qty_ord - wo_qty_comp > 0
                    GROUP BY wo_nbr
                ) b ON b.wo_nbr = a.wr_nbr
                
                LEFT JOIN ( 
                    select pt_part
                            , max(pt_desc1) pt_desc1
                            , max(pt_desc2) pt_desc2
                    from pt_mstr
                    WHERE pt_domain = 'EYE'
                    group by pt_part
                ) c ON c.pt_part = a.wr_part
                
                WHERE a.wr_domain = 'EYE'
                    AND a.wr_op IN (20)
                    AND wr_qty_comp != a.wr_qty_ord
                    AND wo_status != 'c'
                    AND WR_STATUS != 'C'
                ) a 
                 
            group by dueBy
            order by dueBy asc
            with (noLock)	
        ";
        return $mainQry;
    }
