<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$mainQry = "
    select count(*) hits
    from fs_request a
    left join fs_scheduler b ON b.request_id = a.id
    where a.active = 1 
        AND b.id IS NULL
";

$query = $db->prepare($mainQry);
$query->execute();
$results =  $query->fetch(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
