<?php
use EyefiDb\Databases\DatabaseQad;
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseQad();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_LOWER);

$db_connect_eyefi = new DatabaseEyefi();
$dbEyefi = $db_connect_eyefi->getConnection();
$dbEyefi->setAttribute(PDO::ATTR_CASE, PDO::CASE_LOWER);

$dateFrom = ISSET($_GET['dateFrom']) ? $_GET['dateFrom'] :  date("Y-m-d", time());


$sql = "
    select wr_nbr wr_nbr, 
        a.wr_qty_ord - a.wr_qty_comp openQty, 
        dueBy dueBy, 
        a.wr_part wr_part, 
        wr_op, 
        full_Desc, 
        wr_due, 
        wo_so_job, 
        wo_need_date, 
        wo_ord_date, 
        wo_rel_date, 
        wo_per_date,
        wr_status,
        wr_wkctr
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
        c.full_Desc,
        wo_so_job, 
        wo_need_date, 
        wo_ord_date, 
        wo_rel_date, 
        wo_per_date,
        wr_wkctr, 
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
        from wr_route a 
        join ( 
            select wo_nbr
                , wo_so_job
                , wo_need_date
                , wo_ord_date
                , wo_rel_date
                , wo_per_date
                , wo_due_date
            from wo_mstr 
            where wo_domain = 'EYE' 
                and wo_status != 'c' 
        ) b ON b.wo_nbr = a.wr_nbr 
        LEFT JOIN ( 
            select pt_part
                , max(pt_desc1 || ' ' || pt_desc2) full_Desc
            from pt_mstr
            WHERE pt_domain = 'EYE'
            group by pt_part
        ) c ON c.pt_part = a.wr_part

    where a.wr_qty_ord != a.wr_qty_comp 
        and a.wr_domain = 'EYE'
    ) a
";
$query = $db->prepare($sql);
$query->execute();
$details = $query->fetchAll(PDO::FETCH_ASSOC);

$mainQry = "
    REPLACE INTO eyefidb.overdue_orders (
        wo_nbr
        , part_number
        , part_description
        , open_qty
        , wo_due_date
        , wr_due_by
        , wr_op
        , updated_date
        , unique_id
        , wo_need_date
        , wo_ord_date
        , wo_rel_date
        , wo_per_date
        , wo_so_job
        , wr_status
        , wr_wkctr
    ) VALUES (
        :wo_nbr
        , :part_number
        , :part_description
        , :open_qty
        , :wo_due_date
        , :wr_due_by
        , :wr_op
        , :updated_date
        , :unique_id
        , :wo_need_date
        , :wo_ord_date
        , :wo_rel_date
        , :wo_per_date
        , :wo_so_job
        , :wr_status
        , :wr_wkctr
    )
    ";
$date = date("Y-m-d H:i:s", time());
    foreach($details as $row){
        $unique_id = $row['wr_nbr'] . '-' . $row['wr_op'];
        $query = $dbEyefi->prepare($mainQry);
        $query->bindParam(':wo_nbr', $row['wr_nbr'], PDO::PARAM_STR);
        $query->bindParam(':part_number', $row['wr_part'], PDO::PARAM_STR);
        $query->bindParam(':part_description', $row['full_desc'], PDO::PARAM_STR);
        $query->bindParam(':open_qty', $row['openqty'], PDO::PARAM_STR);
        $query->bindParam(':wo_due_date', $row['wr_due'], PDO::PARAM_STR);
        $query->bindParam(':wr_due_by', $row['dueby'], PDO::PARAM_STR);
        $query->bindParam(':wr_op', $row['wr_op'], PDO::PARAM_STR);
        $query->bindParam(':updated_date', $date, PDO::PARAM_STR);
        $query->bindParam(':unique_id', $unique_id, PDO::PARAM_STR);
        $query->bindParam(':wo_need_date', $row['wo_need_date'], PDO::PARAM_STR);
        $query->bindParam(':wo_ord_date', $row['wo_ord_date'], PDO::PARAM_STR);
        $query->bindParam(':wo_rel_date', $row['wo_rel_date'], PDO::PARAM_STR);
        $query->bindParam(':wo_per_date', $row['wo_per_date'], PDO::PARAM_STR);
        $query->bindParam(':wo_so_job', $row['wo_so_job'], PDO::PARAM_STR);
        $query->bindParam(':wr_status', $row['wr_status'], PDO::PARAM_STR);
        $query->bindParam(':wr_wkctr', $row['wr_wkctr'], PDO::PARAM_STR);
        $query->execute();
    }



// $mainQry = "
//     REPLACE INTO eyefidb.so_overdue_orders (
//         so_line
//         , so_nbr
//         , part_number
//         , open_qty
//         , due_date
//         , updated_date
//         , unique_id
//     ) VALUES (
//         :sod_line
//         , :sod_nbr
//         , :sod_part
//         , :open_qty
//         , :due_date
//         , :updated_date
//         , :unique_id
//     )
//     ";
//     $date = date("Y-m-d H:i:s", time());
//     foreach($so_details as $row){
//         $unique_id = $row['sod_nbr'] . '-' . $row['sod_line'];
//         $query = $dbEyefi->prepare($mainQry);
//         $query->bindParam(':sod_line', $row['sod_line'], PDO::PARAM_STR);
//         $query->bindParam(':sod_nbr', $row['sod_nbr'], PDO::PARAM_STR);
//         $query->bindParam(':sod_part', $row['sod_part'], PDO::PARAM_STR);
//         $query->bindParam(':open_qty', $row['openqty'], PDO::PARAM_STR);
//         $query->bindParam(':due_date', $row['sod_due_date'], PDO::PARAM_STR);
//         $query->bindParam(':updated_date', $date, PDO::PARAM_STR);
//         $query->bindParam(':unique_id', $unique_id, PDO::PARAM_STR);
//         $query->execute();
//     }

echo $db_connect->json_encode(array(
    "details" => $details
));
