<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$mainQry = "
   
select a.type title
                , a.description
                , a.start start
                , a.end  end
                , 0 allDay
                , a.backgroundColor color
                , a.textColor textColor
                ,  '' recurring
                , a.title resource
                , a.id
            from companyHoliday a
            where date(a.start) between :dateFrom AND :dateTo

";
$query = $db->prepare($mainQry);
$query->bindParam(':dateFrom', $_GET['dateFrom'], PDO::PARAM_STR);
$query->bindParam(':dateTo', $_GET['dateTo'], PDO::PARAM_STR);
$query->execute();
$events =  $query->fetchAll(PDO::FETCH_ASSOC);


$mainQry = "
    select property title
    , min(concat(a.request_date, ' ', a.start_time)) start
    , max(DATE_ADD(concat(a.request_date, ' ', a.start_time), INTERVAL 2 HOUR) ) end
    , d.background_color color
    , d.text_color textColor
    , group_concat(c.user) resource
    , group_concat(c.user) id
    , group_concat(DISTINCT a.id) fsIdNumber
    , group_id
    , count(DISTINCT a.id) totalJobs
    , customer
    from fs_scheduler a
    left join fs_team c ON c.fs_det_id = a.id
    left join fs_settings d ON d.value = a.status AND d.type = 'status'
    where date(a.request_date) between :dateFrom AND :dateTo and a.active = 1
    group by property
    , d.background_color
    , d.text_color
    , group_id
    , customer
";
$query = $db->prepare($mainQry);
$query->bindParam(':dateFrom', $_GET['dateFrom'], PDO::PARAM_STR);
$query->bindParam(':dateTo', $_GET['dateTo'], PDO::PARAM_STR);
$query->execute();
$jobs =  $query->fetchAll(PDO::FETCH_ASSOC);


$mainQry = "
    select concat(a.first, ' ', a.last) id
    , concat(a.first, ' ', a.last) name
    , title
    from db.users a 
    where area = 'Field Service'
    AND active = 1 AND access = 1
    UNION ALL
    select name id
    , name
    , 'Vendor' title
    from eyefidb.fs_vendors b
    ORDER BY  name ASC
";
$query = $db->prepare($mainQry);
$query->execute();
$users =  $query->fetchAll(PDO::FETCH_ASSOC);


$newJobResource = [];
foreach($jobs as $key) {  
    $key['resource'] = (explode(",",$key['resource']));  
    $newJobResource[] = $key;
}

$eventsResource = [];
foreach($events as $key) {    
    $key['resource'] = (explode(",",$key['resource']));
    $eventsResource[] =  $key;
}

$result = array_merge($eventsResource, $newJobResource);

echo $db_connect->json_encode(array(
    "info" =>$result,
    "eventsResource" =>$eventsResource,
    "info1" =>$users
));
