<?php

use EyefiDb\Api\Ncr\Ncr;
use EyefiDb\Databases\DatabaseEyefi;
use PHPMailer\PHPMailer\PHPMailer;

try {
$_POST = json_decode(file_get_contents("php://input"), true);


$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new Ncr($db);



$link       = 'https://dashboard.eye-fi.com/dist/web/dashboard/quality/car/overview?id=' . $_GET['id'] . '&active=2' ;



if($_POST['ca_iss_to'] == 'Production'){
    $to = emailNotification('car_assigned_to_production');
}else if($_POST['ca_iss_to'] == 'Logistics'){
    $to = emailNotification('car_assigned_to_logistics');
}else if($_POST['ca_iss_to'] == 'Quality'){
    $to = emailNotification('car_assigned_to_quality');
}else if($_POST['ca_iss_to'] == 'NPI'){
    $to = emailNotification('car_assigned_to_npi');
}


$subject = "You are now assigned to NCR # " . $_GET['id'];
$msg = "This NCR is assigned to the ".$_POST['ca_iss_to']." team and must be completed and submitted before or on " . $_POST['ca_due_dt'];


$mail = new PHPMailer(true);
$mail->isHTML(true);
$mail->CharSet = 'UTF-8';
$mail->setFrom('noreply@the-fi-company.com', 'DB The-Fi-Company');
$mail->Subject = $subject;

// Split comma-separated email addresses and add each one individually
$emails = explode(',', $to);
foreach($emails as $email) {
    $mail->AddAddress(trim($email));
}

$message = '<html><body>';
$message .= "<br>";
$message .= $msg;
$message .= "<br><br>";
$message .= "To view this NCR, please click <a href='{$link}'> here </a>. ";
$message .= "<br>";
$message .= "</body></html>";

// Set the email body
$mail->Body = $message;

if($mail->send()){
    $_POST['ca_email_sent_to'] = $to;
    $results = $data->update($_GET['id'], $_POST);
}



} catch (PDOException $e) {
    http_response_code(500);
    die($e->getMessage());
}