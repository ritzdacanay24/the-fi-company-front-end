<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$mainQry = "
    select a.*, b.active
    from page_access a
    left join page_access_options b on b.name = a.page_name
    where a.user_id = :user_id and a.page_name = :page_name and a.active = 1
";
$query = $db->prepare($mainQry);
$query->bindParam(':user_id', $_GET['user_id'], PDO::PARAM_STR);
$query->bindParam(':page_name', $_GET['page_name'], PDO::PARAM_STR);
$query->execute();
$results = $query->fetch(PDO::FETCH_ASSOC);

$enablePageAccess = true;

if(!$enablePageAccess){
    echo $db_connect->json_encode(true);
}else if($results && $results['active'] == 0){
    echo $db_connect->json_encode(true);
}else{
    echo $db_connect->json_encode($results ? true :false);
}

