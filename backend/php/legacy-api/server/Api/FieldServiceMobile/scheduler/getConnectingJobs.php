<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$mainQry = "
    select a.id fsId
        , a.workOrderTicketId
        , a.property
    from fs_scheduler_view a

    where a.group_id = :group_id
    order by a.request_date ASC
";
$query = $db->prepare($mainQry);
$query->bindParam(':group_id', $_GET['group_id'], PDO::PARAM_STR);
$query->execute();
$results =  $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
