<?php
    use EyefiDb\Databases\DatabaseEyefi;
    use PHPMailer\PHPMailer\PHPMailer;

    $db_connect = new DatabaseEyefi();
    $db = $db_connect->getConnection();
    $db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);
    $db->setAttribute(PDO::ATTR_ORACLE_NULLS, PDO::NULL_EMPTY_STRING);

    require "/var/www/html/server/Api/FieldServiceMobile/functions/index.php";

    $_POST = json_decode(file_get_contents("php://input"), true);

    $table = 'fs_workOrder';

    $qry = dynamicUpdate($table, $_POST, $_GET['id']);
    
    $query = $db->prepare($qry);
    $query->execute();


    $status = $_POST['review_status'];

    $link       = 'https://dashboard.eye-fi.com/dist/web/field-service/ticket/overview?selectedViewType=Open&active=7&id=' .  $_POST['fs_scheduler_id'] ;

    
    $mail = new PHPMailer(true);
    $mail->isHTML(true);
            $mail->CharSet = 'UTF-8';
    $mail->setFrom('noreply@the-fi-company.com', 'DB The-Fi-Company');

    if($_POST['review_status'] == 'Pending Review'){
        $mail->AddAddress("nick.walter@the-fi-company.com");
        $mail->AddAddress("adriann.k@the-fi-company.com");
        $mail->addBCC("ritz.dacanay@the-fi-company.com");
        $mail->Subject = "Action Required: Billing Review - " . $_POST['fs_scheduler_id'];

        $mail->Body = '<html><body>';
        $mail->Body .= '<p>Dear Management,</p>';
        $mail->Body .= '<p>A billing review is required for the following work order:</p>';
        $mail->Body .= '<p><strong>Work Order ID:</strong> ' . htmlspecialchars($_POST['fs_scheduler_id']) . '<br />';
        $mail->Body .= '<strong>Status:</strong> ' . htmlspecialchars($status) . '</p>';
        $mail->Body .= '<p>You can review the billing details by clicking <a href="' . $link . '">this link</a>.</p>';
        $mail->Body .= '<p>Thank you for your prompt attention to this matter.</p>';
        $mail->Body .= '<p>Best regards,<br/>The-Fi-Company</p>';
        $mail->Body .= '<hr style="margin:30px 0;" />';
        $mail->Body .= '<p style="font-size: 12px;">This is an automated email. Please do not respond.<br/>Thank you.</p>';
        $mail->Body .= '</body></html>';

        $mail->send();



    }else if($_POST['review_status'] == 'Accounting'){

        $mail->AddAddress("adriann.k@the-fi-company.com");
        $mail->addBCC("ritz.dacanay@the-fi-company.com");
        $mail->Subject = "Action Required: Billing Review - " . $_POST['fs_scheduler_id'];

        $mail->Body = '<html><body>';
        $mail->Body .= '<p>Dear Accounting Team,</p>';
        $mail->Body .= '<p>A billing review is required for the following work order:</p>';
        $mail->Body .= '<p><strong>Work Order ID:</strong> ' . htmlspecialchars($_POST['fs_scheduler_id']) . '<br />';
        $mail->Body .= '<strong>Status:</strong> ' . htmlspecialchars($status) . '</p>';
        $mail->Body .= '<p>You can review the billing details by clicking <a href="' . $link . '">this link</a>.</p>';
        $mail->Body .= '<p>Thank you for your prompt attention to this matter.</p>';
        $mail->Body .= '<p>Best regards,<br/>The-Fi-Company</p>';
        $mail->Body .= '<hr style="margin:30px 0;" />';
        $mail->Body .= '<p style="font-size: 12px;">This is an automated email. Please do not respond.<br/>Thank you.</p>';
        $mail->Body .= '</body></html>';

        $mail->send();

        
    }



    echo $db_connect->json_encode($qry);