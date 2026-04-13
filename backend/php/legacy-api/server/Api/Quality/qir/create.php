<?php
    require '/var/www/html/server/Databases/DatabaseEyefiV1.php';
    use PHPMailer\PHPMailer\PHPMailer;
    
    $_POST = json_decode(file_get_contents("php://input"), true);

    $table_name = "qa_capaRequest";

    $data = $database->insert($table_name, $_POST);

    $last_id = $database->id();

    $data = $database->update($table_name, ["qir"=>$last_id], [
        "id" => $last_id
    ]);

    $nowDate = date("Y-m-d H:i:s", time());

    $emailUsers = emailNotification('internal_qir_notification');

    $link = 'https://dashboard.eye-fi.com/dist/web/dashboard/quality/qir/edit?id=' . $last_id;

    $subject = "New QIR Submitted " . $last_id . " Stakeholder " . $_POST['stakeholder'];

    $mail = new PHPMailer(true);
    $mail->isHTML(true);
    $mail->CharSet = 'UTF-8';
    $mail->setFrom('noreply@the-fi-company.com', 'DB The-Fi-Company');
    $mail->Subject = $subject;

    $addresses = explode(',', $emailUsers);
    foreach ($addresses as $address) {
        $mail->AddAddress($address);
    }
    $mail->addCC("ritz.dacanay@the-fi-company.com");
       
    
    $mail->Body = '<html><body style="padding:50px">';

    $mail->Body .= "Please do not reply to this email. To view this qir, click on the direct link to <a href='{$link}' target='_parent'>Quality Inspection Report</a>. <br><br>";
    $mail->Body .= 'QIR Number: ' . $last_id . '.  The QIR info and the issue statement is included below. <br>';
    $mail->Body .= '<br>';
    $mail->Body .= 'Created Date:  ' . $nowDate . '<br>';
    $mail->Body .= 'Stakeholder:  ' . $_POST['stakeholder'] . '<br>';
    $mail->Body .= 'Failure Type:  ' . $_POST['failureType'] . '<br>';
    $mail->Body .= 'Customer Name:  ' . $_POST['customerName'] . '<br>';
    $mail->Body .= 'Component Type:  ' . $_POST['componentType'] . '<br>';
    $mail->Body .= 'Type:  ' . $_POST['type1'] . '<br>';
    $mail->Body .= 'Part Number:  ' . $_POST['eyefiPartNumber'] . '<br>';
    $mail->Body .= 'Qty Affected:  ' . $_POST['qtyAffected'] . '<br>';
    $mail->Body .= 'Severity:  ' . $_POST['priority'] . '<br>';

    $mail->Body .= 'Issue statement: <br>';
    $mail->Body .= $_POST['issueComment'] . '<br>';

    $mail->Body .= "<p> <a href='{$link}' target='_parent'>View QIR</a> </p>";
    $mail->Body .= '<br>';
    $mail->Body .= "Thank you <br>";
    $mail->Body .= "</body></html>";
    $mail->send();


echo json_encode(array("insertId" => $last_id));