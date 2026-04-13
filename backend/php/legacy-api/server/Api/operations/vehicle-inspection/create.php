<?php
    require '/var/www/html/server/Databases/DatabaseForm.php';
    use PHPMailer\PHPMailer\PHPMailer;
    
    $_POST = json_decode(file_get_contents("php://input"), true);

    $table_name = "shipping_request";

    $data = $database->insert($table_name, $_POST);

    $lastInsertId = $database->id();

    $mail = new PHPMailer(true);
    $mail->isHTML(true);
        $mail->CharSet = 'UTF-8';
    $mail->setFrom('noreply@the-fi-company.com', 'DB The-Fi-Company');
    $mail->Subject = "Shipping Request Form #" . $lastInsertId;

    $mail->AddAddress("eyefilogistics@the-fi-company.com");
    $mail->addCC("ritz.dacanay@the-fi-company.com");

    $link = "https://dashboard.eye-fi.com/dist/web/operations/forms/shipping-request/edit?id=" . $lastInsertId;

    $mail->Body = '<html><body>';

    $mail->Body .= 'Hello Team, <br /><br />';
    $mail->Body .= 'A shipping request form was submitted. <br>';
    $mail->Body .= 'Please click <a href="' . $link . '">here</a> to view the shipping request details. <br> <br>';
    $mail->Body .= '---------------------------------------------------- <br>';
    $mail->Body .= 'This is an automated email. Please do not respond.';
    $mail->Body .= '<br><br><br>';
    $mail->Body .= "</body></html>";

    $headers  = "From: " . ($from) . "\r\n";
    $headers .= "Cc: $cc\r\n";
    $headers .= "Reply-To: " . ($to) . "\r\n";
    $headers .= "Return-Path: " . ($to) . "\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=ISO-8859-1\r\n";
    $headers .= "X-Priority: 1\r\n";
    $headers .= "X-Mailer: PHP" . phpversion() . "\r\n";

    if ($mail->send()) {
        echo json_encode(array("insertId" => $lastInsertId));
    } else {        
        echo json_encode("Email not sent.");
    };

