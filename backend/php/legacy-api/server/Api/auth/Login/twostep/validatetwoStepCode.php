<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$_POST = json_decode(file_get_contents("php://input"), true);

$passCode = $_POST['passCode'];

$mainQry = "
    select a.*, b.email
    from auth_code a
    left join db.users b on b.id = a.user_id
    where passCode = :passCode 
        and a.activated = 0
";
$query = $db->prepare($mainQry);
$query->bindParam(':passCode', $passCode, PDO::PARAM_STR);
$query->execute();
$results =  $query->fetch(PDO::FETCH_ASSOC);

if($results){
    echo json_encode(array("valid" => true, "data" => $_POST, "results" => $results));
}else{
    echo json_encode(array("valid" => false));
}