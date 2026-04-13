<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$dateFrom = $_GET['dateFrom'];
$dateTo = $_GET['dateTo'];

$mainQry = "
select fs_work_order_summary_view.platform AS platform
,fs_work_order_summary_view.service_type AS service_type
,sum(fs_work_order_summary_view.service_mins) AS total_mins
,truncate(avg(fs_work_order_summary_view.service_mins),2) AS avg_mins
,count(fs_work_order_summary_view.platform) AS jobs 
from eyefidb.fs_work_order_summary_view 
where (fs_work_order_summary_view.platform <> '') and request_date between :dateFrom and :dateTo
group by fs_work_order_summary_view.platform
,fs_work_order_summary_view.service_type
";
$query = $db->prepare($mainQry);
$query->bindParam(':dateFrom', $_GET['dateFrom'], PDO::PARAM_STR);
$query->bindParam(':dateTo', $_GET['dateTo'], PDO::PARAM_STR);
$query->execute();
$results =  $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
