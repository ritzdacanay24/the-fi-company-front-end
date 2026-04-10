<?php
require '/var/www/html/server/Databases/DatabaseEyefiV1.php';
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$_POST = json_decode(file_get_contents("php://input"), true);


$mainQry = "
    select *
    from daily_report_config
    where user_id = :user_id
";
$query = $db->prepare($mainQry);
$query->bindParam(':user_id', $_POST['user_id'], PDO::PARAM_STR);
$query->execute();
$results =  $query->fetch(PDO::FETCH_ASSOC);

if($results){
    
    $data = $database->update('daily_report_config', $_POST, [
        "user_id" => $_POST['user_id']
    ]);

}else{
    $database->insert("daily_report_config", $_POST);
}
