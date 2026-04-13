<?php
use EyefiDb\Databases\DatabaseEyefi;


$db_connectEyefi = new DatabaseEyeFi();
$dbEyeFi = $db_connectEyefi->getConnection();
$dbEyeFi->setAttribute(PDO::ATTR_CASE, PDO::CASE_LOWER);

$dateFrom = $_GET['dateFrom'];
$dateTo = $_GET['dateTo'];

$sql = "
SELECT COUNT(*) total
    , SUM(case when date(ca_submitted_date) <= ca_due_dt THEN 1 ELSE 0 END) on_time
FROM ncr
where  ca_action_req = 'Yes' AND ACTIVE = 1
";
$query = $dbEyeFi->prepare($sql);
$query->execute();
$chartData = $query->fetchAll(PDO::FETCH_ASSOC);

//chart data 

$series = [];
$label = [];
foreach($chartData as $row){
    $series[] = $row['total'];
    $series[] =$row['on_time'];
}


echo $db_connectEyefi->json_encode(array(
    "series" => $series,
    "label" => $label
));
