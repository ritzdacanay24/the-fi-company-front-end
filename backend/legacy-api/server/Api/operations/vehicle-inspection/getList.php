<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);


$mainQry = "
    SELECT a.*
        , total_count
        , failed_count
        , TRUNCATE(passed_count/total_count*100,2) percent
        , passed_count
        , confirmed_resolved_count
    FROM forms.vehicle_inspection_header a
    LEFT JOIN (
        SELECT forklift_checklist_id
            , count(id) total_count
            , sum(case when status = 0 THEN 1 ELSE 0 END) failed_count
            , sum(case when status = 1 THEN 1 ELSE 0 END) passed_count
            , sum(case when status = 0 AND resolved_confirmed_date IS NULL THEN 1 ELSE 0 END) confirmed_resolved_count
        FROM forms.vehicle_inspection_details
        GROUP BY forklift_checklist_id
    ) b ON b.forklift_checklist_id = a.id
";

$mainQry .= " order by a.date_created DESC";


$query = $db->prepare($mainQry);
$query->execute();
$results =  $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
