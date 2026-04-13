<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$mainQry = "
    select a.*, concat('https://dashboard.eye-fi.com/attachments/fieldService/', a.fileName) link, concat(b.first, ' ', b.last) created_by_name
    from fs_workOrderTrip a
    LEFT JOIN db.users b ON b.id = a.created_by
    where a.workOrderId = :workOrderId
    order by a.date asc, a.time asc
";

$query = $db->prepare($mainQry);
$query->bindParam(':workOrderId', $_GET['workOrderId'], PDO::PARAM_STR);
$query->execute();
$results =  $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
