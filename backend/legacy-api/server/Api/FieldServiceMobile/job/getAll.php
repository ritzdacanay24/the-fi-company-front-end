<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$dateFrom =  $_GET['dateFrom'];
$dateTo =  $_GET['dateTo'];
$isAll =  $_GET['isAll'];

$mainQry = "
    select a.*
    from fs_scheduler_view a
";

if($isAll == "true"){
    $mainQry .= " WHERE id != 0 ";
}else{
    $mainQry .= " WHERE request_date between '$dateFrom' AND '$dateTo' ";
}

if(ISSET($_GET['selectedViewType']) && $_GET['selectedViewType'] == 'Open'){
    $mainQry .= " AND status IN ('Pending', 'Confirmed') AND a.active = 1";
}else if(ISSET($_GET['selectedViewType']) && $_GET['selectedViewType'] == 'Completed'){
    $mainQry .= " AND status IN ('Completed') ";
}

$mainQry .= " ORDER BY request_date DESC, start_time DESC";

$query = $db->prepare($mainQry);
$query->execute();
$results =  $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
