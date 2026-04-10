<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$mainQry = "
    SELECT a.id, b.fs_travel_header_id, fsIds
    FROM fs_travel_header a 
    LEFT JOIN (
        SELECT fs_travel_header_id, GROUP_CONCAT(DISTINCT fsId) fsIds
        FROM fs_travel_det
        GROUP BY fs_travel_header_id
    ) b ON b.fs_travel_header_id = a.id
    order by a.id desc
";

$query = $db->prepare($mainQry);
$query->execute();
$results =  $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
