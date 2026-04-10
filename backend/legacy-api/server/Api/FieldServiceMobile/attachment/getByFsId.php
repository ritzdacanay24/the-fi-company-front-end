<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$mainQry = "
    SELECT a.request_id, a.id, b.*, concat('https://dashboard.eye-fi.com/attachments/fieldService/', fileName) link
    FROM fs_scheduler a 
    JOIN attachments b ON b.uniqueId = a.request_id AND FIELD IN ('Field Service Request')
    WHERE a.id = :id
    UNION ALL 
    SELECT a.request_id, a.id, b.*, concat('https://dashboard.eye-fi.com/attachments/fieldService/', fileName) link
    FROM fs_scheduler a 
    JOIN attachments b ON b.uniqueId = a.id AND FIELD IN ('Field Service Scheduler')
    WHERE a.id = :id1
    UNION ALL 
    SELECT a.request_id, a.id, b.*, concat('https://dashboard.eye-fi.com/attachments/fieldService/', fileName) link
    FROM fs_scheduler a 
    JOIN attachments b ON b.uniqueId = a.id AND FIELD IN ('Field Service Receipts')
    WHERE a.id = :id1
";
$query = $db->prepare($mainQry);

$query->bindParam(':id', $_GET['fsid'], PDO::PARAM_STR);
$query->bindParam(':id1', $_GET['fsid'], PDO::PARAM_STR);
$query->execute();
$results =  $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
