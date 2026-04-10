<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);


$mainQry = "
    select fs_travel_header_id
    from fs_travel_det
    where fsId = :id
";
$query = $db->prepare($mainQry);
$query->bindParam(':id', $_GET['id'], PDO::PARAM_STR);
$query->execute();
$results =  $query->fetch(PDO::FETCH_ASSOC);

$mainQry = "
    select *
    from fs_travel_det
    where fs_travel_header_id = :fs_travel_header_id
";
$query = $db->prepare($mainQry);
$query->bindParam(':fs_travel_header_id', $results['fs_travel_header_id'], PDO::PARAM_STR);
$query->execute();
$details =  $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($details);
