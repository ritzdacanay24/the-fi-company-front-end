<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$dateFrom =  $_GET['dateFrom'];
$dateTo =  $_GET['dateTo'];

$mainQry = "
    select a.*
    from companyHoliday a
    where date(start) between '$dateFrom' AND '$dateTo'
";

$mainQry .= " ORDER BY start DESC";

$query = $db->prepare($mainQry);
$query->execute();
$results =  $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
