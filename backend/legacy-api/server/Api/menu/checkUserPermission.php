<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$mainQry = "
    select a.*, b.id page_access_id
    from menu a 
    LEFT JOIN page_access b ON b.menu_id = a.id AND b.user_id = :user_id and b.active = 1
    where a.link = :link
    order by seq asc, label asc
";
$query = $db->prepare($mainQry);
$query->bindParam(':user_id', $_GET['user_id'], PDO::PARAM_STR);
$query->bindParam(':link', $_GET['link'], PDO::PARAM_STR);
$query->execute();
$results = $query->fetch(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);