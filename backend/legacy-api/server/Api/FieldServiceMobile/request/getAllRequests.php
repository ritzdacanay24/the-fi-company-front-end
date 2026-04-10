<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$mainQry = "
    select a.*,  
        DATEDIFF(curDate(), a.created_date) total_days,
        b.id fs_scheduler_id
    from fs_request a
    left join fs_scheduler b ON b.request_id = a.id
";

if(ISSET($_GET['selectedViewType']) && $_GET['selectedViewType'] == 'Open'){
    $mainQry .= " where a.active = 1 AND b.id IS NULL ";
}else if(ISSET($_GET['selectedViewType']) && $_GET['selectedViewType'] == 'Closed'){
    $mainQry .= " where a.active = 1 AND b.id IS NOT NULL";
}

$mainQry .= " order by a.created_date DESC";

$query = $db->prepare($mainQry);
$query->execute();
$results =  $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
