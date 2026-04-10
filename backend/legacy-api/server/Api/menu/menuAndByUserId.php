<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$mainQry = "
    select a.*, IF(b.active = 1 and b.id, b.id, null) page_access_id, case when b.active = 0 THEN 'Requested Access' END page_access_requested
    from menu a 
    LEFT JOIN page_access b ON b.menu_id = a.id AND b.user_id = :user_id
    order by seq asc, label asc
";
$query = $db->prepare($mainQry);
$query->bindParam(':user_id', $_GET['id'], PDO::PARAM_STR);
$query->execute();
$results = $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);