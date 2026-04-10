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
    from safety_incident a 
";

if($isAll == "true"){
    $mainQry .= " WHERE a.id != 0 ";
}else{
    $mainQry .= " WHERE date(created_date) between '$dateFrom' AND '$dateTo' ";
}
if(ISSET($_GET['selectedViewType'])  && ($_GET['selectedViewType'] == 'Open' || $_GET['selectedViewType'] == 'In Process')){
    $mainQry .= " AND a.status IN ('In Process', 'Open')";
}else if(ISSET($_GET['selectedViewType']) && $_GET['selectedViewType'] == 'Closed'){
    $mainQry .= " AND a.status = 'Closed' ";
}

$mainQry .= " order by a.created_date DESC";


$query = $db->prepare($mainQry);
$query->execute();
$results =  $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
