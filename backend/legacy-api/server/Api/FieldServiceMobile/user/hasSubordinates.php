<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$sqlStyle = "
    select *
    from db.users
    where parentId = :id
    and active = 1 and isEmployee = 1

";
$query = $db->prepare($sqlStyle);
$query->bindParam(':id', $_GET['id'], PDO::PARAM_STR);
$query->execute();
$results =  $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
