<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$dateFrom = $_GET['dateFrom'];
$dateTo = $_GET['dateTo'];
$isAll =  $_GET['isAll'];

$mainQry = "
    select *, case when ca_iss_to IS NULL THEN 'No Department Selected' ELSE ca_iss_to END ca_iss_to
    from ncr a 
";

if($isAll == "true"){
    $mainQry .= " WHERE a.id != 0 ";
}else{
    $mainQry .= " WHERE created_date between '$dateFrom' AND '$dateTo' ";
}

if(ISSET($_GET['selectedViewType']) && $_GET['selectedViewType'] == 'Open'){
    $mainQry .= " AND a.active = 1 AND (a.submitted_date IS NULL OR TRIM(a.submitted_date) = '') ";
}else if(ISSET($_GET['selectedViewType']) && $_GET['selectedViewType'] == 'Closed'){
    $mainQry .= " AND a.active = 1 AND (a.submitted_date IS NOT NULL AND TRIM(a.submitted_date) != '') ";
}

$mainQry .= " order by a.created_date DESC";


$query = $db->prepare($mainQry);
$query->execute();
$results =  $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
