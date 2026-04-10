<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$mainQry = "
    select a.*, cc.group_ids
    from fs_scheduler_view a
    
    left join (
        select group_concat(id) group_ids, group_id
        from fs_scheduler 
        group by group_id
    ) cc ON cc.group_id = a.group_id

    where installers LIKE '%".$_GET['tech']."%'
    and date(request_date) between :dateFrom and :dateTo
    order by full_request_date ASC
";
$query = $db->prepare($mainQry);
$query->bindParam(':dateFrom', $_GET['dateFrom'], PDO::PARAM_STR);
$query->bindParam(':dateTo', $_GET['dateTo'], PDO::PARAM_STR);
$query->execute();
$results =  $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
