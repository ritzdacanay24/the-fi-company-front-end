<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$mainQry = "
  select a.id
 	, a.user_id
	 , a.accuracy
	 , a.latitude
	 , a.longitude
	 , a.created_date
	 , concat(first, ' ', last) user
	 , color
	 , a.id geo_id
	 , b.image
    , 'location' type_of
    , '' type_of_event
    from geo_location_tracker a
    left join db.users b on b.id = a.user_id
    WHERE DATE(created_date) BETWEEN :dateFrom AND :dateTo and created_date > '2024-11-14 13:00:00'
    UNION ALL 
    
    SELECT a.id
    	, a.userId user_id
	   , '' accuracy
     	, SUBSTRING_INDEX(a.projectStartCoordinates, ',', 1) latitude
		 ,  substring_index(SUBSTRING_INDEX(a.projectStartCoordinates, ',', -1),',',1) longitude
		 , a.projectStart created_date
		 , concat(first, ' ', last) user
		 , color color
		 , '' geo_id
		 , b.image image
    	 , 'event' type_of
    , proj_type type_of_event
	 FROM fs_workOrderProject a
    left join db.users b on b.id = a.userId
	 WHERE DATE(a.projectStart) BETWEEN :dateFrom AND :dateTo AND ( a.projectStartCoordinates IS NOT NULL) and projectStart > '2024-11-14 13:00:00'
    order by created_date DESC
	    
";

$query = $db->prepare($mainQry);
$query->bindParam(':dateFrom', $_GET['dateFrom'], PDO::PARAM_STR);
$query->bindParam(':dateTo', $_GET['dateTo'], PDO::PARAM_STR);
$query->execute();
$results =  $query->fetchAll(PDO::FETCH_ASSOC);

$mainQry = "
    select concat(first, ' ', last) user, a.id user_id, color, sum(IFNULL(b.total,0)+IFNULL(c.total,0)) total
    from db.users a
    LEFT JOIN (
        SELECT COUNT(*) total,  user_id
        from eyefidb.geo_location_tracker a
        WHERE DATE(created_date) between :dateFrom AND :dateTo and created_date > '2024-11-14 13:00:00'
        GROUP BY user_id
	 ) b ON b.user_id = a.id
    LEFT JOIN (
        SELECT count(*) total
    	, a.userId user_id
	 FROM fs_workOrderProject a
    left join db.users b on b.id = a.userId
	 WHERE DATE(a.projectStart) BETWEEN :dateFrom AND :dateTo AND ( a.projectStartCoordinates IS NOT NULL) and projectStart > '2024-11-14 13:00:00'
        GROUP BY user_id
	 ) c ON c.user_id = a.id
    WHERE area = 'Field Service' and a.active = 1 and title = 'Installer'
    group by concat(first, ' ', last), a.id, color
";

$query = $db->prepare($mainQry);
$query->bindParam(':dateFrom', $_GET['dateFrom'], PDO::PARAM_STR);
$query->bindParam(':dateTo', $_GET['dateTo'], PDO::PARAM_STR);
$query->execute();
$list =  $query->fetchAll(PDO::FETCH_ASSOC);


$mainQry = "
    SELECT * 
    FROM fs_workOrderProject a
    WHERE DATE(a.projectStart) between :dateFrom AND :dateTo and projectStart > '2024-11-14 13:00:00'
";

$query = $db->prepare($mainQry);
$query->bindParam(':dateFrom', $_GET['dateFrom'], PDO::PARAM_STR);
$query->bindParam(':dateTo', $_GET['dateTo'], PDO::PARAM_STR);
$query->execute();
$events =  $query->fetchAll(PDO::FETCH_ASSOC);


foreach($list as &$row){
    $row['details'] = [];
    foreach($results as &$detailsRow){
        if($row['user_id'] == $detailsRow['user_id']){
            $row['details'][] = $detailsRow;
        }
    }
}

$mainQry = "
    SELECT a.id fs_scheduler_id
        , a.request_date start
        , a.start_time start_time
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
$query->bindParam(':dateFrom', $_GET['dateFrom'], PDO::PARAM_STR);
$query->bindParam(':dateTo', $_GET['dateTo'], PDO::PARAM_STR);
$query->execute();
$jobs =  $query->fetchAll(PDO::FETCH_ASSOC);


echo $db_connect->json_encode(array("results"=>$results, "list" => $list, "jobs" => $jobs));
