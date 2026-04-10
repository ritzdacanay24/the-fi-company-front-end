<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$dateFrom = $_GET['dateFrom'];
$dateTo = $_GET['dateTo'];

$mainQry = "
    select count(*) total
        , month(request_date) month
        , year(request_date) year
        , request_date
        , sum(case when b.contractor_code IS NOT NULL THEN 1 ELSE 0 END) contractor_assigned
        , sum(case when b.contractor_code IS NULL THEN 1 ELSE 0 END) tech_jobs_assigned
        , case when b.contractor_code IS NOT NULL THEN 1 ELSE 0 END contractor
        , case when b.contractor_code IS NULL THEN 1 ELSE 0 END tech
        , b.contractor_code
    from fs_scheduler a 
    left join fs_team b ON b.fs_det_id =  a.id
    where request_date between :dateFrom and :dateTo
    group by month(request_date)
        , year(request_date)
        , request_date
        , b.contractor_code 
        , case when b.contractor_code IS NOT NULL THEN 1 ELSE 0 END
        , case when b.contractor_code IS NULL THEN 1 ELSE 0 END
        , b.contractor_code
    order by year(request_date) DESC, month(request_date) DESC
";
$query = $db->prepare($mainQry);
$query->bindParam(':dateFrom', $_GET['dateFrom'], PDO::PARAM_STR);
$query->bindParam(':dateTo', $_GET['dateTo'], PDO::PARAM_STR);
$query->execute();
$results =  $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
