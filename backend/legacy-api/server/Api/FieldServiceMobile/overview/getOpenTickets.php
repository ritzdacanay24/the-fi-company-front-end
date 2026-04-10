<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$mainQry = "
    select count(*) hits
    from fs_workOrder a
    join fs_scheduler b ON b.id = a.fs_scheduler_id and b.active = 1
    WHERE a.active = 1 AND a.dateSubmitted IS NULL
";

$query = $db->prepare($mainQry);
$query->execute();
$results =  $query->fetch(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
