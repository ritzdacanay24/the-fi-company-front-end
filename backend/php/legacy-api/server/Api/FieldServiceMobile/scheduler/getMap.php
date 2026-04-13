<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$dateFrom = $_GET['dateFrom'];
$dateTo = $_GET['dateTo'];

$mainQry = "
    SELECT a.id, COUNT(c.id) total_jobs
    , case when a.title = 'Vendor' THEN a.first ELSE concat(a.first, ' ', a.last) END username
    FROM db.users a 
    LEFT JOIN  eyefidb.fs_team b ON b.user_id = a.id
    LEFT JOIN eyefidb.fs_scheduler c ON c.id = b.fs_det_id and c.active = 1
    WHERE ((a.area = 'Field Service' and a.active = 1) OR a.title = 'Vendor')
    AND date(request_date) between :dateFrom and :dateTo 
    GROUP BY a.id, case when a.title = 'Vendor' THEN a.first ELSE concat(a.first, ' ', a.last) END
    order by case when a.title = 'Vendor' THEN a.first ELSE concat(a.first, ' ', a.last) END asc
";
$query = $db->prepare($mainQry);
$query->bindParam(':dateFrom', $dateFrom, PDO::PARAM_STR);
$query->bindParam(':dateTo', $dateTo, PDO::PARAM_STR);
$query->execute();
$results =  $query->fetchAll(PDO::FETCH_ASSOC);


$mainQry = "
    SELECT a.id fs_scheduler_id
        , a.request_date start
        , b.user_id
        , a.fs_lat
        , a.fs_lon
        , service_type
        , techs
        , case when a.fs_lat IS NOT NULL AND a.fs_lon IS NOT NULL THEN 'Coordinates Found' ELSE 'Coordinates Not Found' END cordFound
        , case when d.dateSubmitted IS NOT NULL THEN 'Completed' when d.id IS NOT NULL THEN 'Started' ELSE 'Not Started' END status
        , d.dateSubmitted
        , case when d.dateSubmitted IS NOT NULL THEN 'bg-success' when date(request_date) = date(now()) THEN 'bg-warning' else 'bg-primary' end backgroundColor
    FROM fs_scheduler a 
    LEFT JOIN fs_team b ON b.fs_det_id = a.id
    LEFT JOIN (
        SELECT group_concat(user  ORDER BY user ASC SEPARATOR ', ') techs 
            , fs_det_id 
        FROM fs_team 
        GROUP BY fs_det_id 
    ) cc ON cc.fs_det_id = a.id

    LEFT JOIN eyefidb.fs_workOrder d ON a.id = d.fs_scheduler_id

    where  a.active = 1
        and date(request_date) between :dateFrom and :dateTo
    order by a.request_date asc
";
$query = $db->prepare($mainQry);
$query->bindParam(':dateFrom', $dateFrom, PDO::PARAM_STR);
$query->bindParam(':dateTo', $dateTo, PDO::PARAM_STR);
$query->execute();
$details =  $query->fetchAll(PDO::FETCH_ASSOC);

foreach($results as &$row){
    $row['details'] = [];
    foreach($details as &$detailsRow){
        if($row['id'] == $detailsRow['user_id']){
            $row['details'][] = $detailsRow;
        }
    }
}


echo $db_connect->json_encode(
    array("listData"=>$results, "mapData"=> $details)
);
