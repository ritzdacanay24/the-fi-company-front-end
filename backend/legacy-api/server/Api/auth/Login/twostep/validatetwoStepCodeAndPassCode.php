<?php
use EyefiDb\Databases\DatabaseEyefi;
use \Firebase\JWT\JWT;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$_POST = json_decode(file_get_contents("php://input"), true);

$passCode = $_POST['passCode'];
$code = $_POST['code'];

$mainQry = "
    select *
    from auth_code a
    where passCode = :passCode 
        and code = :code
        and a.activated = 0
";
$query = $db->prepare($mainQry);
$query->bindParam(':passCode', $passCode, PDO::PARAM_STR);
$query->bindParam(':code', $code, PDO::PARAM_STR);
$query->execute();
$results = $query->fetch(PDO::FETCH_ASSOC);

$now_seconds = time();
$secret_key = '77c7be081fc39abae9f69e0cdec4352fd701b51dcc3d54762a17ac35c8493954';
$issuer_claim = 'the-fi-company-twostep'; // this can be the servername
$audience_claim = 'the-fi-company-twostep';
$issuedat_claim = $now_seconds; // issued at
$notbefore_claim = $now_seconds + (86400 * 7); //not before in seconds
$expire_claim = $now_seconds  + (7 * 24 * 60 * 60); // expire time in seconds
           
$token = array(
    "iss" => $issuer_claim,
    "aud" => $audience_claim,
    "iat" => $issuedat_claim,
    "exp" => $expire_claim,
    "data" => array(
        "expire_claim" => $expire_claim,
        "issuedat_claim" => $issuedat_claim,
    )
);

// tell the user they are logged in
$jwt = JWT::encode($token, $secret_key);



if($results){
    $mainQry = "
        update auth_code
        set activated = 1
        where passCode = :passCode 
            and code = :code
    ";
    $query = $db->prepare($mainQry);
    $query->bindParam(':passCode', $passCode, PDO::PARAM_STR);
    $query->bindParam(':code', $code, PDO::PARAM_STR);
    $query->execute();

    echo json_encode(array("valid" => true, "twostep_token" => $jwt));
}else{
    echo json_encode(array("valid" => false));
}