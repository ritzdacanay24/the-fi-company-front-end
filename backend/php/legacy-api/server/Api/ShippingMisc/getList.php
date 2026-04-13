<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$mainQry = "
    select *
    from workOrderOwner a 
";

if(ISSET($_GET['active']) && $_GET['active'] == 1){
    $mainQry .= " WHERE a.active = 1 ";
}else if(ISSET($_GET['active']) && $_GET['active'] == 0){
    $mainQry .= " WHERE a.active = 0 ";
}

$query = $db->prepare($mainQry);
$query->execute();
$results =  $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
