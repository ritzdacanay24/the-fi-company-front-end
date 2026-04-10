<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$mainQry = "
    select *
    from job_and_event_view
    where start between :dateFrom and :dateTo
";
$query = $db->prepare($mainQry);
$query->bindParam(':dateFrom', $_GET['dateFrom'], PDO::PARAM_STR);
$query->bindParam(':dateTo', $_GET['dateTo'], PDO::PARAM_STR);
$query->execute();
$results =  $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
