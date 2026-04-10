<?php
    require '/var/www/html/server/Databases/DatabaseEyefiV1.php';

    use EyefiDb\Databases\DatabaseEyefi;

    use PHPMailer\PHPMailer\PHPMailer;

    $db_connect = new DatabaseEyefi();
    $db = $db_connect->getConnection();
    $db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

    
    $_POST = json_decode(file_get_contents("php://input"), true);

    $table_name = "safety_incident";

    $database->insert("safety_incident", $_POST);

    $lastInsertId = $database->id();

    $emailUsers         = emailNotification('safety_incident');

    $mail = new PHPMailer(true);
    $mail->isHTML(true);
            $mail->CharSet = 'UTF-8';
    $mail->setFrom('noreply@the-fi-company.com', 'DB The-Fi-Company');
    $mail->Subject = "Safety Incident - " . $lastInsertId;

    $addresses = explode(',', $emailUsers);
    foreach ($addresses as $address) {
        $mail->AddAddress($address);
    }
         

    $link = "https://dashboard.eye-fi.com/dist/web/operations/forms/safety-incident/edit?id=" . $lastInsertId;

    $mail->Body = '<html><body>';

    $mail->Body .= 'Please click <a href="' . $link . '">here</a> to view the Safety Incident details. <br> <br>';
    $mail->Body .= "</body></html>";

    if ($mail->send()) {
        echo json_encode(array("insertId" => $lastInsertId));
    } else {        
        echo json_encode("Email not sent.");
    };

