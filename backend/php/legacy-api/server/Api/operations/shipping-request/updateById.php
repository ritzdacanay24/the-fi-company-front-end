<?php
    require '/var/www/html/server/Databases/DatabaseForm.php';
    use PHPMailer\PHPMailer\PHPMailer;
    
    $_POST = json_decode(file_get_contents("php://input"), true);

    $table_name = "shipping_request";

    if(ISSET($_POST['sendTrackingNumberTo'])){
        if(is_array($_POST['sendTrackingNumberTo'])) {
            $_POST['sendTrackingNumberTo'] = implode(",", $_POST['sendTrackingNumberTo']);
        }
    }

    $data = $database->update($table_name, $_POST, [
        "id" => $_GET['id']
    ]);

    if(ISSET($_POST['sendTrackingEmail'])){
        sendEmailAboutTrackingNumber($_POST['sendTrackingNumberTo'], $_POST['trackingNumber'], $_GET['id']);
    }

    echo json_encode(array("rowCount" => $data->rowCount()));


    // functions 

    function sendEmailAboutTrackingNumber($to, $trackingNumber, $id)
    {

        $to         = $to;
        $ccEmails         = emailNotification('tracking_number_notification_shipping_request');

        $subject    = "Shipping Request Form #" . $id;

        
    $mail = new PHPMailer(true);
    $mail->isHTML(true);
        $mail->CharSet = 'UTF-8';
    $mail->setFrom('noreply@the-fi-company.com', 'DB The-Fi-Company');
    $mail->Subject = $subject;

    $mail->AddAddress($to);

    
    $addresses = explode(',', $ccEmails);
    foreach ($addresses as $address) {
        $mail->addCC($address);
    }
       

        //$link = 'https://dashboard.eye-fi.com/dist/v1/forms/shipping-request?shippingRequestId=' . $id;
        $link = "https://dashboard.eye-fi.com/dist/web/operations/forms/shipping-request/edit?id=" . $id;


        $mail->Body = '<html><body>';

        $mail->Body .= 'Hello your shipment has been processed.  Your tracking # is ' . $trackingNumber . '<br><br>';
        $mail->Body .= 'Please click <a href="' . $link . '">here</a> to view the shipping request details. <br> <br>';

        $mail->Body .= 'Thank you. <br>';
        $mail->Body .= '---------------------------------------------------- <br>';
        $mail->Body .= 'This is an automated email. Please do not respond.';
        $mail->Body .= '<br><br><br>';
        $mail->Body .= "</body></html>";

        if ($mail->send()) {
            return "Email sent.";
        } else {
            return "Email not sent";
        }
    }