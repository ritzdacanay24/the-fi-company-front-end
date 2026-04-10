<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$dateFrom =  $_GET['dateFrom'];
$dateTo =  $_GET['dateTo'];
$isAll =  $_GET['isAll'];

$mainQry = "
    select a.*,  
        b.id fs_scheduler_id,
        b.request_date, 
        b.status
    from fs_workOrder a
    join fs_scheduler b ON b.id = a.fs_scheduler_id and b.active = 1
";

if($isAll == "true"){
    $mainQry .= " WHERE a.id != 0 ";
}else{
    $mainQry .= " WHERE request_date between '$dateFrom' AND '$dateTo' ";
}

if(ISSET($_GET['selectedViewType']) && $_GET['selectedViewType'] == 'Open'){
    $mainQry .= " AND a.active = 1 AND a.dateSubmitted IS NULL ";
}else if(ISSET($_GET['selectedViewType']) && $_GET['selectedViewType'] == 'Closed'){
    $mainQry .= " AND a.active = 1 AND a.dateSubmitted IS NOT NULL";
}

$mainQry .= " order by b.request_date DESC";

$query = $db->prepare($mainQry);
$query->execute();
$results =  $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
