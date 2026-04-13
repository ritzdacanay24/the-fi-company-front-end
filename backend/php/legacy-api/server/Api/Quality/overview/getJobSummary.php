
<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$dateFrom = $_GET['dateFrom'];
$dateTo = $_GET['dateTo'];

$qry = "
select count(*) value
    , complaint_code label
from eyefidb.ncr 
where id != 0 
    AND date(created_date) between :dateFrom AND :dateTo and complaint_code <> ''
group by complaint_code
ORDER BY count(*) DESC
";
$stmt = $db->prepare($qry);
$stmt->bindParam(":dateFrom", $dateFrom, PDO::PARAM_STR);
$stmt->bindParam(":dateTo", $dateTo, PDO::PARAM_STR);
$stmt->execute();
$results = $stmt->fetchAll(PDO::FETCH_ASSOC);

$chartData = array();
foreach ($results as $row) {
    $chartData['label'][] = $row['label'];
    $chartData['value'][] = $row['value'];
}

echo $db_connect->json_encode(array(
    "chartData" => $chartData, 
));
