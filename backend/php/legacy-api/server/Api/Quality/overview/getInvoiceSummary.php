
<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$dateFrom = $_GET['dateFrom'];
$dateTo = $_GET['dateTo'];

$qry = "
select count(*) value
    , failureType label
from eyefidb.qa_capaRequest 
where id != 0 
    AND date(createdDate) between :dateFrom AND :dateTo and failureType <> ''
group by failureType
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
