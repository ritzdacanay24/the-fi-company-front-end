<?php
    use EyefiDb\Databases\DatabaseEyefi;
    use PHPMailer\PHPMailer\PHPMailer;

    $db_connect = new DatabaseEyefi();
    $db = $db_connect->getConnection();
    $db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);
    $db->setAttribute(PDO::ATTR_ORACLE_NULLS, PDO::NULL_EMPTY_STRING);

    require "/var/www/html/server/Api/FieldServiceMobile/functions/index.php";

    $_POST = json_decode(file_get_contents("php://input"), true);

    
    $mainQry = "
        select *
        from fs_request
        where id = :fs_request_id
    ";
    $query = $db->prepare($mainQry);
    $query->bindParam(':fs_request_id', $_POST['fs_request_id'], PDO::PARAM_STR);
    $query->execute();
    $results =  $query->fetch(PDO::FETCH_ASSOC);


    $table = 'fs_comments';

    $qry = dynamicInsert($table, $_POST);
    
    $query = $db->prepare($qry);
    $query->execute();

    $link       = 'https://dashboard.eye-fi.com/dist/web/request?token=' . $results['token'] . '&viewComment=1' ;
    $linkUsers       = 'https://dashboard.eye-fi.com/dist/web/field-service/request/edit?id=' . $results['id']. '&viewComment=1' ;
    //$link       = 'http://localhost:4201/request?token=' . $_GET['token'] . '&viewComment=1' ;

    if(ISSET($_POST['request_change']) && $_POST['request_change']){
        $msg = "<h2 style='color:red'>** Request Change ** </h2>";
    } else{
        $msg = "";
    }

    $msg .= "

        New comment added by {$_POST['name']} <br><br>

        {$_POST['comment']} <br><br>

        A new comment was added. Please click <a href='{$link}'> here </a> to view/add comment.<br><br>

    ";

    $mail = new PHPMailer(true);
    $mail->isHTML(true);
    $mail->CharSet = 'UTF-8';
    $mail->setFrom('noreply@the-fi-company.com', 'DB The-Fi-Company');
    $mail->Subject = $results['subject'];

    $email_notification = explode(',', emailNotification('field_service_comment_notification_request_form'));

    $toEmail = [$results['email']];

    $to = array_merge($toEmail, $email_notification);

    $to      = implode(',', $to);

    $to = explode(',', $to);
    foreach ($to as $address) {
        $mail->AddAddress($address);
    }

    if($results['cc_email'] != ""){
        $cc = explode(',', $results['cc_email']);
        foreach ($cc as $address) {
            $mail->addCC($address);
        }
    }
       
    $mail->addBCC('ritz.dacanay@the-fi-company.com');

    $mail->Body = '<html><body>';
    $mail->Body .= $msg;
    $mail->Body .= "<br><br>";
    $mail->Body .= "Details<br/>";
    $mail->Body .= "Request ID: " . $results['id'] . "<br/>";
    $mail->Body .= "Request Date of Service: " . $results['date_of_service']. "<br/>";
    $mail->Body .= "Request Time of Service: " . $results['start_time']. "<br/>";
    $mail->Body .= "Customer CO: " . $results['customer_co_number']. "<br/>";
    $mail->Body .= "SO #: " . $results['so_number']. "<br/>";
    $mail->Body .= "Property: " . $results['property']. "<br/>";
    $mail->Body .= "state: " . $results['state']. "<br/>";
    $mail->Body .= "city: " . $results['city']. "<br/>";
    $mail->Body .= "<br>";
    $mail->Body .= "<br>";
    $mail->Body .= "<hr>";
    $mail->Body .= "Field serivce schedulers, please click <a href='{$linkUsers}'> here </a> to view request.";
    $mail->Body .= "</body></html>";

    $mail->send();

    echo $db_connect->json_encode($_POST);
