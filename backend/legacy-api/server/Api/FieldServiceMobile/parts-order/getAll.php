<?php
use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Databases\DatabaseQad;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);


$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();
$dbQad->setAttribute(PDO::ATTR_CASE, PDO::CASE_LOWER);

$mainQry = "
    select *
    from fs_parts_order
";
$query = $db->prepare($mainQry);
$query->execute();
$results =  $query->fetchAll(PDO::FETCH_ASSOC);

$in_array = array();
foreach ($results as $row) {
    $in_array[] = $row['so_number'];
}

$in = "'" . implode("','", $in_array) . "'";

$mainQry = "
    select a.sod_nbr
        , a.sod_due_date
        , CASE 
            WHEN b.pt_part IS NULL 
                THEN a.sod_desc
            ELSE b.fullDesc
        END fullDesc                    
        , a.sod_qty_ord-a.sod_qty_ship qty_open
        , c.so_ord_date so_ord_date
        , f.abs_ship_qty abs_ship_qty
        , f.abs_shp_date abs_shp_date

    from sod_det a
    
    left join (
        select pt_part			
            , max(pt_desc1) pt_desc1
            , max(pt_desc2) pt_desc2				
            , max(CONCAT(pt_desc1, pt_desc2)) fullDesc
            , max(pt_routing) pt_routing
        from pt_mstr
        where pt_domain = 'EYE'
        group by pt_part		
    ) b ON b.pt_part = a.sod_part

    
    join (
        select so_nbr	
            , so_cust
            , so_ord_date
            , so_ship
            , so_bol
            , so_cmtindx
            , so_compl_date
            , so_shipvia
            , LEFT(TO_CHAR(oid_so_mstr), 8) oid_so_order_date 
            , RIGHT(TO_CHAR(ROUND(oid_so_mstr,0)), 10) oid_so_order_time
            , oid_so_mstr
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
        GROUP BY abs_shipto
            , abs_shp_date
            , abs_item
            , abs_line
            , abs_inv_nbr
            , abs_par_id
            , abs_order
    ) f ON f.abs_order = a.sod_nbr


    where a.sod_domain = 'EYE'
        AND a.sod_nbr IN ($in)
";
$query = $dbQad->prepare($mainQry);
$query->execute();
$qadInfo =  $query->fetchAll(PDO::FETCH_ASSOC);


foreach($results as &$row){

    $row['qad_info'] = new \stdClass();
    $row['isPastDue'] = 'No';
    $row['details'] = json_decode($row['details'], true);

    foreach ($qadInfo as $qadInfoRow) {
        if ($row['so_number'] == $qadInfoRow['sod_nbr']) {
            $row['qad_info'] = $qadInfoRow;

            //check if past due
            if($qadInfoRow['sod_due_date'] > $row['arrival_date'] && $qadInfoRow['qty_open'] != 0){
                $row['isPastDue'] = 'Yes';
            }
        }
    }
}

echo $db_connect->json_encode($results);
