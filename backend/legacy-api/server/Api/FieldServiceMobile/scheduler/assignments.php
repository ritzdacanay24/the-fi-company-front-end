<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);


$mainQry = "
    select  * 
    from fs_full_events 
    where LOWER(team) LIKE CONCAT('%', :user, '%') 
    and request_date IS NOT NULL
    and date(request_date) between :dateFrom and :dateTo
";

$query = $db->prepare($mainQry);
$query->bindParam(':user', $_GET['user'], PDO::PARAM_STR);
$query->bindParam(':dateFrom', $_GET['dateFrom'], PDO::PARAM_STR);
$query->bindParam(':dateTo', $_GET['dateTo'], PDO::PARAM_STR);
$query->execute();
$results = $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
