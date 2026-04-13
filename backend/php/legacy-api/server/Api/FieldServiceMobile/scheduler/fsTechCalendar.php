<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);


$user_id = ISSET($GET['user_id']) ? $GET['user_id'] : null;

//Active Jobs only.
$mainQry = "
select CONCAT(a.request_date, ' ',  a.start_time) start,
 date_add(CONCAT(a.request_date, ' ',  a.start_time), INTERVAL 3 hour) end,
    a.id,
    concat(IFNULL(CONCAT(a.customer, ' ',  a.property), 'No title'), '-', a.service_type) title, 
    'JOB' type_of_event,
    CASE WHEN a.published = 0 OR a.published IS NULL THEN '#E8E8E8' ELSE f.statusColor END color,
    'green' borderColor,
    'green' backgroundColor,
    CASE WHEN a.published = 0 OR a.published IS NULL THEN 'text-dark' ELSE '' END cssClass,
    CASE WHEN a.published = 0 OR a.published IS NULL THEN '#000' WHEN f.color IS NULL THEN '#000' ELSE f.color END textColor,
    a.id fs_scheduler_id,
    a.active, 
    a.property,
    a.customer,
    a.status,
    b.id ticket_id, 
    case when d.id IS NOT NULL THEN d.id else c.user END resource,
    case when d.id IS NOT NULL THEN d.id else c.user END slots,
    techs,
    total_techs,
    out_of_state,
    platform, 
    service_type,
    b.dateSubmitted,
    acc_status
from fs_scheduler a
LEFT JOIN eyefidb.fs_scheduler_settings f ON f.value = a.status AND f.type = 'status'
LEFT JOIN eyefidb.fs_workOrder b ON b.fs_scheduler_id = a.id
LEFT JOIN eyefidb.fs_team c ON c.fs_det_id = a.id
LEFT JOIN (
	SELECT group_concat(user SEPARATOR ', ') techs 
        , fs_det_id
        , COUNT(a.id) total_techs 
    FROM fs_team a
	 GROUP BY fs_det_id 
) cc ON cc.fs_det_id = a.id

left join (
    select id
    , case when title = 'Vendor' THEN first ELSE concat(first, ' ', last) END user
    from db.users
) d ON d.user = c.user

where date(request_date) BETWEEN :dateFrom AND :dateTo
and (a.schedule_later IS NULL OR a.schedule_later = 0)
and a.active = 1
";
$query = $db->prepare($mainQry);
$query->bindParam(':dateFrom', $_GET['dateFrom'], PDO::PARAM_STR);
$query->bindParam(':dateTo', $_GET['dateTo'], PDO::PARAM_STR);
$query->execute();
$events =  $query->fetchAll(PDO::FETCH_ASSOC);

//Calendar events only
$mainQry = "
select start start,
    IFNULL(end, start) end,
    a.id,
    case when techRelated THEN a.type ELSE a.title END title, 
    'EVENT' type_of_event,
    a.backgroundColor color,
    a.backgroundColor borderColor,
    IFNULL(a.text_color,'text-white') cssClass,
    textColor,

    case when techRelated AND a.resource_id IS NOT NULL THEN a.resource_id ELSE a.title END resource, 
    techRelated,
    allDay
from companyHoliday a
where (date(start) between :dateFrom and :dateTo OR date(IFNULL(end, start)) between :dateFrom and :dateTo)
and a.active = 1
";
$query = $db->prepare($mainQry);
$query->bindParam(':dateFrom', $_GET['dateFrom'], PDO::PARAM_STR);
$query->bindParam(':dateTo', $_GET['dateTo'], PDO::PARAM_STR);
$query->execute();
$events1 =  $query->fetchAll(PDO::FETCH_ASSOC);


//Calendar events only
$mainQry = "
    SELECT a.id, b.request_id 
    , a.dateAndTime start 
    , a.dateAndTime end 
    , a.id 
    , 'Unassigned' resource 
    , 'REQUEST' type_of_event 
    , 'purple' color  
    , '#fff' borderColor
    , '#fff' textColor 
    , 'Peding Request' title 
    , type_of_service 
    , a.requested_by 
    , a.customer 
    , a.property 
    FROM fs_request a 
    LEFT JOIN fs_scheduler b ON b.request_id = a.id 
    WHERE a.active = 1 
    AND b.request_id IS NULL 
 
";
$query = $db->prepare($mainQry); 
$query->execute(); 
$unassigned =  $query->fetchAll(PDO::FETCH_ASSOC); 


$mainQry = "
    select  a.id id
    , case when title = 'Vendor' THEN first ELSE concat(first, ' ', last) END  name 
    , case when title = 'Vendor' THEN first ELSE concat(first, ' ', LEFT(last, 1), '.' ) END  short_name 
        , title 
        , a.id resource_id 
        , a.leadInstaller lead_tech 
        , a.active 
        , a.access 
        , a.image 
    from db.users a 
    where (area = 'Field Service' OR title = 'Vendor') 
        order by case when title = 'Vendor' THEN first ELSE concat(first, ' ', last) END ASC 
";
$query = $db->prepare($mainQry); 
$query->execute(); 
$users =  $query->fetchAll(PDO::FETCH_ASSOC); 

$eventsResource = []; 

$allUsers = [];

foreach($users as $key) { 
    $allUsers[] = $key['id'];
}

foreach($events1 as $key) {    
    
    if($key['resource'] == ""){
        $key['resource'] = $allUsers;
    }else{
        $key['resource'] = (explode(",",$key['resource']));
    }
    $eventsResource[] =  $key;
}



$results = array_merge($events, $eventsResource, $unassigned);


//$result = array_merge($eventsResource);

echo $db_connect->json_encode(array(
    "info" =>$results,
    "eventsResource" =>$eventsResource,
    "info1" =>$users,
    "allUsers" =>$allUsers,
    "results" => $results,
    "events1" => $events1
));
