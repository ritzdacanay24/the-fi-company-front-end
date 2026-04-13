<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$mainQry = "
    select count(*) hits
    from fs_scheduler a
    join fs_workOrder b ON b.fs_scheduler_id = a.id and b.active = 1 AND b.dateSubmitted IS NOT NULL
    where invoice_date IS NULL 
    AND a.active = 1
    AND status IN ('Pending', 'Confirmed', 'Completed')
    order by a.request_date DESC
";

$query = $db->prepare($mainQry);
$query->execute();
$results =  $query->fetch(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
