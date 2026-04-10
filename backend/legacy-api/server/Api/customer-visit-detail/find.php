<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$mainQry = "
    select *
    from customer_visit_log_details 
    where customer_visit_log_id = :id
";

$query = $db->prepare($mainQry);
$query->bindParam(':id', $_GET['customer_visit_log_id'], PDO::PARAM_STR);
$query->execute();
$results =  $query->fetchAll(PDO::FETCH_ASSOC);


$mainQry = "
    select *, concat('https://dashboard.eye-fi.com/attachments/fieldService/', fileName) link
    from attachments 
    where field = 'Field Service Customer Visit'
    and mainId = :id
";

$query = $db->prepare($mainQry);
$query->bindParam(':id', $_GET['customer_visit_log_id'], PDO::PARAM_STR);
$query->execute();
$attachments =  $query->fetchAll(PDO::FETCH_ASSOC);

foreach($results as &$row){
    $row['attachments'] = array();
    foreach($attachments as $row1){
        if($row1['uniqueId'] == $row['id']){
            $row['attachments'][] = $row1;
        }
    }
}


echo $db_connect->json_encode($results);
