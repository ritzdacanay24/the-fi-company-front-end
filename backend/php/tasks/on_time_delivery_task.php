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
$dateTo = ISSET($_GET['dateTo']) ? $_GET['dateTo'] :  date("Y-m-d", time());

$sql = "
    select so_cust
        , so_nbr
        , a.sod_line
        , sod_per_date
        , f.abs_shp_date last_shipped_on
        , CAST(a.sod_qty_ord AS DECIMAL(16,2)) sod_qty_ord
        , IFNULL(CAST(f.abs_ship_qty AS DECIMAL(16,2)),0) abs_ship_qty
        , IFNULL(a.sod_per_date-f.abs_shp_date,a.sod_per_date-curDate()) diff
        , WEEK(sod_per_date) week
        , YEAR(sod_per_date) year
        , MONTH(sod_per_date) month
        , case 
            when a.sod_per_date-f.abs_shp_date < 0 AND a.sod_per_date < curDate()
            THEN 'Yes' 
            when f.abs_shp_date IS NULL
            THEN 'Yes' 
            when a.sod_per_date < curDate() AND a.sod_qty_ord != f.abs_ship_qty
            THEN 'Yes' 
            ELSE 'No' 
        END  is_late
        , case when a.sod_qty_ord - f.abs_ship_qty > 0 THEN 'Shipped Partial' END shipped_partial
        , abs_par_id
    from sod_det a     
    join (    
        select so_nbr	    
            , so_cust       
        from so_mstr     
        where so_domain = 'EYE'     
    ) c ON c.so_nbr = a.sod_nbr     

    LEFT join (
        select a.abs_shipto
            , a.abs_shp_date
            , a.abs_item
            , a.abs_line
            , sum(a.abs_ship_qty) abs_ship_qty
            , a.abs_inv_nbr
            , substring(abs_par_id, 2, LENGTH(abs_par_id)) abs_par_id
            , a.abs_order
        from abs_mstr a
        where a.abs_domain = 'EYE'
        GROUP BY a.abs_shipto
            , a.abs_shp_date
            , a.abs_item
            , a.abs_line
            , a.abs_inv_nbr
            , substring(abs_par_id, 2, LENGTH(abs_par_id))
            , a.abs_order
    ) f ON f.abs_order = a.sod_nbr
        AND f.abs_line = a.sod_line

    where (( f.last_shipped_on between :dateFrom and :dateTo ) OR sod_per_date between :dateFrom1 and :dateTo1)
     and sod_domain = 'EYE'

";
$sql .= "order by so_cust, a.sod_per_date ASC";
$query = $db->prepare($sql);
$query->bindParam(':dateFrom', $dateFrom, PDO::PARAM_STR);
$query->bindParam(':dateTo', $dateTo, PDO::PARAM_STR);
$query->bindParam(':dateFrom1', $dateFrom, PDO::PARAM_STR);
$query->bindParam(':dateTo1', $dateTo, PDO::PARAM_STR);
$query->execute();
$details = $query->fetchAll(PDO::FETCH_ASSOC);


$table_name = "shortageRequest";

$insertData = [];
foreach($details as $row){
    $sod_nbr_and_line = $row['so_nbr'] . '-' . $row['sod_line'] . '-' . $row['abs_par_id'];

    $qry = '
        REPLACE INTO eyefidb.on_time_delivery (
            so_nbr
            , performance_date
            , shipped_qty
            , week
            , year
            , month
            , difference
            , is_late
            , last_shipped_on
            , shipped_partial
            , customer
            , line_nbr
            , qty_ordered
            , sod_nbr_and_line
        ) 
        VALUES( 
            :so_nbr
            , :performance_date
            , :shipped_qty
            , :week
            , :year
            , :month
            , :difference
            , :is_late
            , :last_shipped_on
            , :shipped_partial
            , :customer
            , :line_nbr
            , :qty_ordered
            , :sod_nbr_and_line
        )
    ';
    $stmt = $dbEyefi->prepare($qry);
    $stmt->bindParam(':so_nbr', $row['so_nbr'], PDO::PARAM_STR);
    $stmt->bindParam(':performance_date', $row['sod_per_date'], PDO::PARAM_STR);
    $stmt->bindParam(':shipped_qty', $row['abs_ship_qty'], PDO::PARAM_STR);
    $stmt->bindParam(':week', $row['week'], PDO::PARAM_STR);
    $stmt->bindParam(':year', $row['year'], PDO::PARAM_STR);
    $stmt->bindParam(':month', $row['month'], PDO::PARAM_STR);
    $stmt->bindParam(':difference', $row['diff'], PDO::PARAM_STR);
    $stmt->bindParam(':is_late', $row['is_late'], PDO::PARAM_STR);
    $stmt->bindParam(':last_shipped_on', $row['last_shipped_on'], PDO::PARAM_STR);
    $stmt->bindParam(':shipped_partial', $row['shipped_partial'], PDO::PARAM_STR);
    $stmt->bindParam(':customer', $row['so_cust'], PDO::PARAM_STR);
    $stmt->bindParam(':line_nbr', $row['sod_line'], PDO::PARAM_STR);
    $stmt->bindParam(':qty_ordered', $row['sod_qty_ord'], PDO::PARAM_STR);
    $stmt->bindParam(':sod_nbr_and_line', $sod_nbr_and_line, PDO::PARAM_STR);
    $stmt->execute();


}

echo $db_connect->json_encode(array(
    "details" => $details
));
