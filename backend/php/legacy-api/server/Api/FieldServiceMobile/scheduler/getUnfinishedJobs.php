<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$mainQry = "
    select a.*,  
        b.id fs_scheduler_id,
        b.request_date, 
        b.status,
        DATEDIFF(CURDATE(), request_date) age,
        techs,
        b.service_type,
        b.customer
    from fs_workOrder a
    join fs_scheduler b ON b.id = a.fs_scheduler_id and b.active = 1
    JOIN (
        SELECT fs_det_id, GROUP_CONCAT(USER) techs 
        FROM fs_team 
        WHERE user_id = :id
        GROUP BY fs_det_id
    ) c ON c.fs_det_id = b.id
    WHERE a.active = 1 AND a.dateSubmitted IS NULL
    order by DATEDIFF(CURDATE(), request_date) desc
";
$query = $db->prepare($mainQry);
$query->bindParam(':id', $_GET['id'], PDO::PARAM_STR);
$query->execute();
$results =  $query->fetchAll(PDO::FETCH_ASSOC);


echo $db_connect->json_encode($results);
