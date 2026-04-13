<?php

        use EyefiDb\Databases\DatabaseEyefi;
        use PHPMailer\PHPMailer\PHPMailer;

        $db_connect = new DatabaseEyefi();
        $db = $db_connect->getConnection();
        $db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

        $_POST = json_decode(file_get_contents("php://input"), true);


        $mainQry = "
            select *
            from page_access
            where user_id = :user_id
            and menu_id = :menu_id
        ";
        $query = $db->prepare($mainQry);
        $query->bindParam(':user_id', $_GET['user_id'], PDO::PARAM_STR);
        $query->bindParam(':menu_id', $_GET['menu_id'], PDO::PARAM_STR);
        $query->execute();
        $results =  $query->fetch(PDO::FETCH_ASSOC);

        if(!$results){
            $mainQry = "
                INSERT INTO page_access (
                    user_id
                    , menu_id
                    , active
                    , created_date
                ) VALUES (
                    :user_id
                    , :menu_id
                    , 0
                    , NOW()
                )
            ";
            $query = $db->prepare($mainQry);
            $query->bindParam(':user_id', $_GET['user_id'], PDO::PARAM_STR);
            $query->bindParam(':menu_id', $_GET['menu_id'], PDO::PARAM_STR);
            $query->execute();
        }

        //START Confirmation email to internal employeed 
        //$to = "nick.walter@the-fi-company.com, juvenal.torres@the-fi-company.com";
        $to ='ritz.dacanay@the-fi-company.com';

        $link = "https://dashboard.eye-fi.com/dist/web/dashboard/maintenance/user/edit?active=3&menu_id=".$_GET['menu_id']."&id=".$_GET['user_id'];
    
        $subject = "Page Request: ";

        
    $mail = new PHPMailer(true);
    $mail->isHTML(true);
        $mail->CharSet = 'UTF-8';
    $mail->setFrom('noreply@the-fi-company.com', 'DB The-Fi-Company');
    $mail->Subject = $subject;

    $mail->AddAddress($to);

    
        $mail->Body = '<html><body style="padding:50px">';
    
        $page_id = $_GET['menu_id'];
        $mail->Body .= "Page Request - $page_id <a href='{$link}' target='_parent'>View Request </a>. <br><br>";
        $mail->Body .= "Page ID: $page_id <br><br>";
        $mail->Body .= '<br>';

        $mail->Body .= "Thank you <br>";
        $mail->Body .= "</body></html>";
    
        $headers = array(
            'From' => 'noreply@the-fi-company.com',
            'Reply-To' => 'noreply@the-fi-company.com',
            'X-Mailer' => 'PHP/' . phpversion(),
            'Content-Type' => 'text/html; charset=ISO-8859-1'
        );
    
        if($mail->send()){
            echo json_encode(array("message" => "Email Sent"));
        }else{
            echo json_encode(array("message" => "Failed Email"));

        }