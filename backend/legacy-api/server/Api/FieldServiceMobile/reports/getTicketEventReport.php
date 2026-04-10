<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$dateFrom = $_GET['dateFrom'];
$dateTo = $_GET['dateTo'];

$mainQry = "
    SELECT a.*
    , case 
       when d.event_type = 0 THEN 'Other' 
       when d.event_type = 1 THEN 'Service' 
       when d.event_type = 2 THEN 'Travel' 
       when d.event_type = 3 THEN 'Non-Service' 
       END label
    , c.id fs_scheduler_id
    , c.service_type
    , c.customer
    , sign_theme
    , sign_type
    , platform
    FROM fs_labor_view a
    left join fs_workOrder b ON b.id = a.workOrderId 
    left join fs_scheduler c ON c.id = b.fs_scheduler_id 
    left join fs_event_type d ON d.event_name = a.event_name 
    where request_date between :dateFrom and :dateTo and d.isEvent = 1
    order by a.workOrderId, request_date
";
$query = $db->prepare($mainQry);
$query->bindParam(':dateFrom', $_GET['dateFrom'], PDO::PARAM_STR);
$query->bindParam(':dateTo', $_GET['dateTo'], PDO::PARAM_STR);
$query->execute();
$results =  $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
