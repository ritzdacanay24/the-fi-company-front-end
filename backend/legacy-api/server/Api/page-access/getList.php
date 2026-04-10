<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$dateFrom = $_GET['dateFrom'];
$dateTo = $_GET['dateTo'];
$isAll =  $_GET['isAll'];

$mainQry = "
    select *
    from mrb_request a 
";

if($isAll == "true"){
    $mainQry .= " WHERE a.id != 0 ";
}else{
    $mainQry .= " WHERE createdDate between '$dateFrom' AND '$dateTo' ";
}

if(ISSET($_GET['selectedViewType']) && $_GET['selectedViewType'] == 'Open'){
    $mainQry .= " AND a.active = 1 AND a.status = 'Open' ";
}else if(ISSET($_GET['selectedViewType']) && $_GET['selectedViewType'] == 'Closed'){
    $mainQry .= " AND a.active = 1 AND a.status = 'Closed' ";
}

$mainQry .= " order by a.createdDate DESC";


$query = $db->prepare($mainQry);
$query->execute();
$results =  $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
