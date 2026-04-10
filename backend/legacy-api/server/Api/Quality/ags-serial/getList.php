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
    from agsSerialGenerator a 
";

if($isAll == "true"){
    $mainQry .= " WHERE a.id != 0 ";
}else{
    $mainQry .= " WHERE date(timeStamp) between '$dateFrom' AND '$dateTo' ";
}

if(ISSET($_GET['selectedViewType']) && $_GET['selectedViewType'] == 'Active'){
    $mainQry .= " AND a.active = 1 ";
}else if(ISSET($_GET['selectedViewType']) && $_GET['selectedViewType'] == 'Inactive'){
    $mainQry .= " AND a.active = 0 ";
}

$mainQry .= " order by a.timeStamp DESC";


$query = $db->prepare($mainQry);
$query->execute();
$results =  $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
