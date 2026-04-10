<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$dateFrom =  $_GET['dateFrom'];
$dateTo =  $_GET['dateTo'];
$isAll =  $_GET['isAll'];

$mainQry = "
    select a.status
        , a.invoice_date
        , a.id
        , a.request_date
        , b.id ticket_started
        , dateSubmitted
        , b.review_status
    from fs_scheduler a
    join fs_workOrder b ON b.fs_scheduler_id = a.id and b.active = 1 AND b.dateSubmitted IS NOT NULL
    where acc_status IS NULL
    AND a.active = 1
    AND status IN ('Pending', 'Confirmed', 'Completed')
";

if($isAll == "false" || !$isAll){
    $mainQry .= " AND request_date between '$dateFrom' AND '$dateTo' ";
}else{
}

$mainQry .= " order by a.request_date DESC ";


$query = $db->prepare($mainQry);
$query->execute();
$results =  $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
