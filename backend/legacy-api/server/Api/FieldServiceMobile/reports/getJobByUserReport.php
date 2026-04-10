<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$dateFrom = $_GET['dateFrom'];
$dateTo = $_GET['dateTo'];

$mainQry = "
    select user
        , sum(case when a.out_of_state = 'Yes' THEN 1 ELSE 0 END) out_of_town
        , sum(case when a.out_of_state = 'No' THEN 1 ELSE 0 END) in_town
        , count(*) total
    from fs_scheduler a 
    left join fs_team b ON b.fs_det_id =  a.id
    where request_date between :dateFrom and :dateTo and status IN ('Completed', 'Confirmed')
    group by user
    order by count(*) DESC
";
$query = $db->prepare($mainQry);
$query->bindParam(':dateFrom', $_GET['dateFrom'], PDO::PARAM_STR);
$query->bindParam(':dateTo', $_GET['dateTo'], PDO::PARAM_STR);
$query->execute();
$results =  $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
