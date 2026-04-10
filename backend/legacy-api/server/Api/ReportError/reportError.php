<?php

$msg = $_GET['errorMessage'];


$to      = 'ritz.dacanay@the-fi-company.com';
$subject = 'Dashboard Error submitted';

$message = '<html><body>';
$message .= "<br>";
$message .= $msg;
$message .= "<br><br>";
$message .= "Error location: " . $_GET['url'];
$message .= "<br><br>";
$message .= "Submitted by:" . $_GET['userName'];
$message .= "<br>";
$message .= "</body></html>";

$headers = 'From: ' . MAIL_NAME . " <" . MAIL_EMAIL . ">\r\n" .
    'Reply-To:' . MAIL_EMAIL . "\r\n";
$headers .= "Reply-To: " . ($to) . "\r\n";
$headers .= "Return-Path: " . ($to) . "\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/html; charset=ISO-8859-1\r\n";
$headers .= "Content-Transfer-Encoding: 64bit\r\n";
$headers .= "X-Priority: 1\r\n";
$headers .= "X-Mailer: PHP" . phpversion() . "\r\n";


mail($to, $subject, $message, $headers);
