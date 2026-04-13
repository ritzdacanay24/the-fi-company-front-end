<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$mainQry = "
    select a.*, concat(b.first, ' ', b.last) username
    from fs_labor_view a
    left join db.users b on b.id = a.userId
    where a.workOrderId = :workOrderId
    order by projectStart ASC, id asc
";
$query = $db->prepare($mainQry);
$query->bindParam(':workOrderId', $_GET['workOrderId'], PDO::PARAM_STR);
$query->execute();
$results =  $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
