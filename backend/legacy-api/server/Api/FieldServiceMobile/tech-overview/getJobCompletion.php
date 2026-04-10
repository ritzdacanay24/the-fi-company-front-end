<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$userId = $_GET['userId'];

$mainQry = "
    select count(*) total
        , sum(case when b.dateSubmitted IS NOT NULL THEN 1 ELSE 0 END) total_completed
        , sum(case when a.out_of_state = 'Yes' THEN 1 ELSE 0 END) total_out_of_town
        , sum(case when a.out_of_state = 'No' THEN 1 ELSE 0 END) total_in_town
    from fs_scheduler a 
    left join fs_workOrder b on b.fs_scheduler_id = a.id 
    left join fs_team c ON c.fs_det_id = a.id 
    left join db.users u on concat(first, ' ', last) = c.user 
    where u.id = :id
";
$query = $db->prepare($mainQry);
$query->bindParam(':id', $userId, PDO::PARAM_STR);
$query->execute();
$results =  $query->fetch(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
