<?php

use PHPMailer\PHPMailer\PHPMailer;

$mail = new PHPMailer(true);
$mail->setFrom('noreply@the-fi-company.com', 'DB The-Fi-Company');


$mail->AddAddress('ritz.dacanay@the-fi-company.com');
$mail->AddAddress('nicholas.kivuvani@the-fi-company.com');

$mail->isHTML(true);
            $mail->CharSet = 'UTF-8';
$mail->Subject = "test";


$mail->Body = 'noreply@dashboard.eye-fi.com';

$mail->send();

//////////

$mail = new PHPMailer(true);
$mail->setFrom('noreply@dashboard.eye-fi.com', 'test');


$mail->AddAddress('ritz.dacanay@the-fi-company.com');
$mail->AddAddress('nicholas.kivuvani@the-fi-company.com');

$mail->isHTML(true);
            $mail->CharSet = 'UTF-8';
$mail->Subject = "test";


$mail->Body = 'using noreply@dashboard.eye-fi.com';

$mail->send();


echo "email sent";