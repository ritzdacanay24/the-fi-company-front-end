<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$dateFrom = $_GET['dateFrom'];
$dateTo = $_GET['dateTo'];

$mainQry = "
    select *
    from fs_billing_expense_view
    where request_date between :dateFrom and :dateTo
    order by request_date DESC
";
$query = $db->prepare($mainQry);
$query->bindParam(':dateFrom', $_GET['dateFrom'], PDO::PARAM_STR);
$query->bindParam(':dateTo', $_GET['dateTo'], PDO::PARAM_STR);
$query->execute();
$results =  $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
