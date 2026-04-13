
<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$dateFrom = $_GET['dateFrom'];
$dateTo = $_GET['dateTo'];

$qry = "
    SELECT concat(MONTH(invoice_date), '-', YEAR(invoice_date)) label
        , sum(invoice) total
        ,  MONTH(invoice_date) month
        , YEAR(invoice_date) year
    FROM fs_scheduler 
    where invoice_date between :dateFrom AND :dateTo
    group by concat(MONTH(invoice_date), '-', YEAR(invoice_date))
    ,  MONTH(invoice_date)
    , YEAR(invoice_date)
    order by YEAR(invoice_date) ASC, MONTH(invoice_date) ASC
";
$stmt = $db->prepare($qry);
$stmt->bindParam(":dateFrom", $dateFrom, PDO::PARAM_STR);
$stmt->bindParam(":dateTo", $dateTo, PDO::PARAM_STR);
$stmt->execute();
$results = $stmt->fetchAll(PDO::FETCH_ASSOC);

$chartData = array();

foreach ($results as $row) {
    $chartData['label'][] = $row['label'];
    $chartData['value'][] = $row['total'];
}

$mainQry = "
    SELECT *
    FROM fs_scheduler 
    where invoice_date between :dateFrom AND :dateTo
";

$query = $db->prepare($mainQry);
$query->bindParam(":dateFrom", $dateFrom, PDO::PARAM_STR);
$query->bindParam(":dateTo", $dateTo, PDO::PARAM_STR);
$query->execute();
$details = $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode(array(
    'chartData' => $chartData
    , 'details' => $details
));
