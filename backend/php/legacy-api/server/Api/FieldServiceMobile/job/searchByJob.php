<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$mainQry = "
    SELECT a.*, b.id workOrderId
    FROM fs_scheduler a 
    LEFT JOIN fs_workOrder b ON b.fs_scheduler_id = a.id
    where a.id = ? 
        OR property LIKE ?
    order by a.request_date DESC
";

$t = $_GET['text'];

$params = array("$t", "%$t%");

$query = $db->prepare($mainQry);
$query->execute($params);
$results = $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
