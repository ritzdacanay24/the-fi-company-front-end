<?php
use EyefiDb\Databases\DatabaseEyefi;
use PHPMailer\PHPMailer\PHPMailer;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$_POST = json_decode(file_get_contents("php://input"), true);

$to = $_POST['email'];

$mainQry = "
    select *
    from db.users
    where email = :email
";
$query = $db->prepare($mainQry);
$query->bindParam(':email', $to, PDO::PARAM_STR);
$query->execute();
$results =  $query->fetch(PDO::FETCH_ASSOC);


$digits = 4;
$code =  rand(pow(10, $digits-1), pow(10, $digits)-1);

$passCode = getName(15);

$mainQry = "
    insert into auth_code (user_id, created_date, code, passCode)
    VALUES (:user_id, now(), :code, :passCode)
";
$query = $db->prepare($mainQry);
$query->bindParam(':user_id', $results['id'], PDO::PARAM_STR);
$query->bindParam(':code', $code, PDO::PARAM_STR);
$query->bindParam(':passCode', $passCode, PDO::PARAM_STR);
$query->execute();


$mail = new PHPMailer(true);
$mail->isHTML(true);
            $mail->CharSet = 'UTF-8';
$mail->Subject = "One time passcode";
$mail->setFrom('noreply@the-fi-company.com', 'DB The-Fi-Company');

$mail->AddAddress($results['email']);

$mail->Body = "Here is your one time code:  " . $code;
$mail->Body .= '<br>';
$mail->Body .= '<br>';

$mail->Body .= "Thank you <br>";
$mail->Body  .= "The-Fi-Company";

if($mail->send()){
    echo json_encode(array("message" => "Email Sent", "passCode" => $passCode));
}else{
    echo json_encode(array("message" => "Failed Email"));

}


$n=10;
function getName($n) {
    $characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    $randomString = '';

    for ($i = 0; $i < $n; $i++) {
        $index = rand(0, strlen($characters) - 1);
        $randomString .= $characters[$index];
    }

    return $randomString;
}
