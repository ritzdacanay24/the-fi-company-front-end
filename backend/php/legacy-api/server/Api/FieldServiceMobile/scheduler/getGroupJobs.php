<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$mainQry = "
    select full_address, full_request_date, customer, dateSubmitted, fs_scheduler_id, service_type, workOrderTicketId, title
    from fs_scheduler_view
    where group_id = :group_id
    
";
$query = $db->prepare($mainQry);
$query->bindParam(':group_id', $_GET['group_id'], PDO::PARAM_STR);
$query->execute();
$results =  $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
