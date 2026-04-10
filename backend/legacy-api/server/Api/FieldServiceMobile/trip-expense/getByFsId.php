<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$mainQry = "
select a.*, concat('https://dashboard.eye-fi.com/attachments/fieldService/', a.fileName) link, concat(b.first, ' ', b.last) created_by_name, c.fs_scheduler_id
from fs_workOrderTrip a
LEFT JOIN db.users b ON b.id = a.created_by
left join fs_workOrder c ON c.id = a.workOrderId
where c.fs_scheduler_id = :fs_scheduler_id OR a.fs_scheduler_id = :fs_scheduler_id1
";

$query = $db->prepare($mainQry);
$query->bindParam(':fs_scheduler_id', $_GET['fs_scheduler_id'], PDO::PARAM_STR);
$query->bindParam(':fs_scheduler_id1', $_GET['fs_scheduler_id'], PDO::PARAM_STR);
$query->execute();
$results =  $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
