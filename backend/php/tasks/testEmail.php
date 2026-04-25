<?php

	use PHPMailer\PHPMailer\PHPMailer;

	$mail = new PHPMailer(true); // Enables exceptions

	$mail->setFrom('ritz.dacanay@the-fi-company.com');
	$mail->addAddress('check-auth@verifier.port25.com', 'ritz');
	$mail->addAddress('ritz.dacanay@the-fi-company.com', 'ritz');
	
	$mail->isHTML(true);
            $mail->CharSet = 'UTF-8';
	$mail->Subject = "PHPMailer SMTP test";
	$mail->Body = 'test'; // Use the CID as the src attribute in your img tag

	if(!$mail->send()){
		echo 'Message could not be sent.';
		echo 'Mailer Error: ' . $mail->ErrorInfo;
	}else{
		echo 'Message has been sent';
	}