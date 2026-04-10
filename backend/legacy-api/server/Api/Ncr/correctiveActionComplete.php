<?php

use EyefiDb\Api\Ncr\Ncr;
use EyefiDb\Databases\DatabaseEyefi;
use PHPMailer\PHPMailer\PHPMailer;

$_POST = json_decode(file_get_contents("php://input"), true);


$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new Ncr($db);

$results = $data->update($_GET['id'], $_POST);

$msg = "CAR " . $_GET['id']. " corrective action completed";

$link       = 'https://dashboard.eye-fi.com/dist/quality/ncr/ncr-form?id=' . $_GET['id'] . '&activeTab=3' ;

$emailUsers = emailNotification('car_corrective_action_complete');

$subject = "CAR " . $_GET['id']. " corrective action completed";


$mail = new PHPMailer(true);
$mail->isHTML(true);
$mail->CharSet = 'UTF-8';
$mail->setFrom('noreply@the-fi-company.com', 'DB The-Fi-Company');
$mail->Subject = $subject;

$addresses = explode(',', $emailUsers);
foreach ($addresses as $address) {
    $mail->AddAddress($address);
}

$mail->Body = '<html><body>';
$mail->Body .= "<br>";
$mail->Body .= $msg;
$mail->Body .= "<br><br>";
$mail->Body .= "To view this NCR, please click <a href='{$link}'> here </a>. ";
$mail->Body .= "<br>";
$mail->Body .= "</body></html>";

$mail->send();

echo json_encode($results);
