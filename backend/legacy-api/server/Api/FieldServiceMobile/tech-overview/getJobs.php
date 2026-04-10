<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$userId = $_GET['userId'];
$status = $_GET['status'];
// $dateFrom = $_GET['dateFrom'];
// $dateTo = $_GET['dateTo'];

$mainQry = "
    select a.id fsid
        , b.id ticket_id
        , a.status
        , a.property
        , a.request_date
        , a.start_time
        , b.dateSubmitted
        , group_concat(c.user) techs
    from fs_scheduler a 
    left join fs_workOrder b on b.fs_scheduler_id = a.id 
    left join fs_team c ON c.fs_det_id = a.id 
    join db.users u on concat(first, ' ', last) = c.user 
    where u.id = :id
";

if($status == 1){
    $mainQry .= " and b.dateSubmitted IS NULL";
}else if($status == 0){
    $mainQry .= " and b.dateSubmitted IS NOT NULL";
}


$mainQry .= " group by a.id
, b.id
, a.status
, a.property
, a.request_date
, a.start_time
, b.dateSubmitted ";

$mainQry .= " order by a.request_date DESC";

$query = $db->prepare($mainQry);
$query->bindParam(':id', $userId, PDO::PARAM_STR);
$query->execute();
$results =  $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
