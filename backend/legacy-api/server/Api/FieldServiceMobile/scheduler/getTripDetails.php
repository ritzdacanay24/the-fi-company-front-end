<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$mainQry = "
    SELECT fs_travel_header_id
    FROM fs_travel_det 
    WHERE fsId = :id
    LIMIT 1
";
$query = $db->prepare($mainQry);
$query->bindParam(':id', $_GET['id'], PDO::PARAM_STR);
$query->execute();
$results =  $query->fetch(PDO::FETCH_ASSOC);


$mainQry = "
    SELECT *
    FROM fs_travel_det 
    WHERE fs_travel_header_id = :id
";
$query = $db->prepare($mainQry);
$query->bindParam(':id', $results['fs_travel_header_id'], PDO::PARAM_STR);
$query->execute();
$data =  $query->fetchAll(PDO::FETCH_ASSOC);

$mainQry = "
    SELECT *, concat('https://dashboard.eye-fi.com/attachments/fieldService/', fileName) url
    FROM attachments 
    WHERE uniqueId = :id
    AND FIELD = 'Field Service Trip Details'
";
$query = $db->prepare($mainQry);
$query->bindParam(':id', $results['fs_travel_header_id'], PDO::PARAM_STR);
$query->execute();
$attachments =  $query->fetchAll(PDO::FETCH_ASSOC);

foreach($data as &$row){
    $row['attachments'] = array();
    foreach($attachments as &$row1){
        if($row['id'] == $row1['mainId']){
            $row['attachments'][] = $row1;
        }        

    }
}


echo $db_connect->json_encode($data);
