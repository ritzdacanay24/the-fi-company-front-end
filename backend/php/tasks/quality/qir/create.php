<?php
    require '/var/www/html/server/Databases/DatabaseEyefiV1.php';
    use PHPMailer\PHPMailer\PHPMailer;
    
    $_POST = json_decode(file_get_contents("php://input"), true);

    $database->pdo->beginTransaction();

    
     function removeHtml($comment)
    {
        $newComment = strip_tags($comment);
        $newComment = html_entity_decode($newComment);

        $newComment = str_replace('Â', '', $newComment);
        $newComment = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $newComment);

        return $newComment;
    }


    try{
        $table_name = "qa_capaRequest";

        if(ISSET($_POST['issueComment'])){
            $_POST['issue_comment_html'] = $_POST['issueComment'];
            $_POST['issueComment'] = $this->removeHtml($_POST['issueComment']);
        }

        $data = $database->insert($table_name, $_POST);
    
        $last_id = $database->id();
    
        $data = $database->update($table_name, ["qir"=>$last_id], [
            "id" => $last_id
        ]);
    
        $database->pdo->commit();

        $nowDate = date("Y-m-d H:i:s", time());
    
        
        //START Confirmation email to internal employeed 
        //$to = "nick.walter@the-fi-company.com, juvenal.torres@the-fi-company.com";
        $emailUsers = emailNotification('external_qir_notification');
        $cc = "ritz.dacanay@the-fi-company.com";
    
        $link = 'https://dashboard.eye-fi.com/dist/fsm/new-web/quality/qir/edit?id=' . $last_id;
    
        $mail = new PHPMailer(true);
        $mail->isHTML(true);
            $mail->CharSet = 'UTF-8';
        $mail->setFrom('noreply@the-fi-company.com', 'DB The-Fi-Company');
        $mail->Subject = "New QIR Submitted " . $last_id;

        $addresses = explode(',', $emailUsers);
        foreach ($addresses as $address) {
            $mail->AddAddress($address);
        }

        $mail->addCC($cc);
                
    
        $mail->Body = '<html><body style="padding:50px">';
    
        $mail->Body .= "Please do not reply to this email. To view this qir, click on the direct link to <a href='{$link}' target='_parent'>Quality Inspection Report</a>. <br><br>";
        $mail->Body .= 'QIR Number: ' . $last_id . '.  The QIR info and the issue statement is included below. <br>';
        $mail->Body .= '<br>';

        $mail->Body .= '<table rules="all" style="border-color: #666;" cellpadding="5" border="1">';
        $mail->Body .= "<tr>";
        $mail->Body .= "<td><strong>QIR Number</strong></td>";
        $mail->Body .= "<td>".$last_id."</td>";
        $mail->Body .= "</tr>";
        $mail->Body .= "<tr>";
        $mail->Body .= "<td><strong>Created Date</strong></td>";
        $mail->Body .= "<td>".$nowDate."</td>";
        $mail->Body .= "</tr>";
        $mail->Body .= "<tr>";
        $mail->Body .= "<td><strong>Failure Type</strong></td>";
        $mail->Body .= "<td>".$_POST['failureType']."</td>";
        $mail->Body .= "</tr>";
        $mail->Body .= "<tr>";
        $mail->Body .= "<td><strong>Customer Name</strong></td>";
        $mail->Body .= "<td>".$_POST['customerName']."</td>";
        $mail->Body .= "</tr>";
        $mail->Body .= "<tr>";
        $mail->Body .= "<td><strong>EyeFi Part Number</strong></td>";
        $mail->Body .= "<td>".$_POST['eyefiPartNumber']."</td>";
        $mail->Body .= "</tr>";
        $mail->Body .= "<tr>";
        $mail->Body .= "<td><strong>Qty Affected</strong></td>";
        $mail->Body .= "<td>".$_POST['qtyAffected']."</td>";
        $mail->Body .= "</tr>";
        $mail->Body .= "<tr>";
        $mail->Body .= "<td><strong>Severity</strong></td>";
        $mail->Body .= "<td>".$_POST['priority']."</td>";
        $mail->Body .= "</tr>";
        $mail->Body .= "</table>";
        $mail->Body .= '<br>';
    
        $mail->Body .= 'Issue statement: <br>';
        $mail->Body .= $_POST['issueComment'] . '<br><br>';
    
        $mail->Body .= "Thank you <br>";
        $mail->Body .= "</body></html>";
    
        $mail->send();
        //END Confirmation email to internal employeed 

        //START Confirmation email to customer 
        // if(ISSET($_POST['email'])){
        //     $to = $_POST['email'];
        //     //$cc = "ritz.dacanay@the-fi-company.com";
        //     $cc_email = ISSET($_POST['cc_email']) ? $_POST['cc_email'] : '';
        //     $cc      = $cc ? implode(',', $cc_email) : "";

        
        //     $link = 'https://dashboard.eye-fi.com/dist/web/dashboard/quality/qir/edit?id=' . $last_id;

        //     $subject = "New QIR Submitted " . $last_id;
        
        //     $mail->Body = '<html><body style="padding:50px">';
        
        //     $mail->Body .= "Hello<br><br>";
        //     $mail->Body .= 'This is just a quick email to say we have received your QIR request.';
        //     $mail->Body .= '<br>';
        //     $mail->Body .= 'In the meantime, if you have any questions, send us an email at casey.cushing@the-fi-company.com and we will be happy to help.';
        //     $mail->Body .= '<br><br>';

        //     $mail->Body .= '<table rules="all" style="border-color: #666;" cellpadding="5" border="1">';
        //     $mail->Body .= "<tr>";
        //     $mail->Body .= "<td><strong>QIR Number</strong></td>";
        //     $mail->Body .= "<td>".$last_id."</td>";
        //     $mail->Body .= "</tr>";
        //     $mail->Body .= "<tr>";
        //     $mail->Body .= "<td><strong>Created Date</strong></td>";
        //     $mail->Body .= "<td>".$nowDate."</td>";
        //     $mail->Body .= "</tr>";
        //     $mail->Body .= "<tr>";
        //     $mail->Body .= "<td><strong>Failure Type</strong></td>";
        //     $mail->Body .= "<td>".$_POST['failureType']."</td>";
        //     $mail->Body .= "</tr>";
        //     $mail->Body .= "<tr>";
        //     $mail->Body .= "<td><strong>Customer Name</strong></td>";
        //     $mail->Body .= "<td>".$_POST['customerName']."</td>";
        //     $mail->Body .= "</tr>";
        //     $mail->Body .= "<tr>";
        //     $mail->Body .= "<td><strong>EyeFi Part Number</strong></td>";
        //     $mail->Body .= "<td>".$_POST['eyefiPartNumber']."</td>";
        //     $mail->Body .= "</tr>";
        //     $mail->Body .= "<tr>";
        //     $mail->Body .= "<td><strong>Qty Affected</strong></td>";
        //     $mail->Body .= "<td>".$_POST['qtyAffected']."</td>";
        //     $mail->Body .= "</tr>";
        //     $mail->Body .= "<tr>";
        //     $mail->Body .= "<td><strong>Severity</strong></td>";
        //     $mail->Body .= "<td>".$_POST['priority']."</td>";
        //     $mail->Body .= "</tr>";
        //     $mail->Body .= "</table>";
        //     $mail->Body .= '<br>';
        
        //     $mail->Body .= 'Issue statement: <br>';
        //     $mail->Body .= $_POST['issueComment'] . '<br><br>';
        
        //     $mail->Body .= "Thank you <br>";
        //     $mail->Body .= "<img src='https://dashboard.eye-fi.com/test/signatures/Picture1.png' alt='The Fi Company' style='width:70px'/>";
        //     $mail->Body .= "</body></html>";
        
        //     $headers = array(
        //         'From' => 'noreply@the-fi-company.com',
        //         'Reply-To' => 'noreply@the-fi-company.com',
        //         'Reply-Path' => $to,
        //         'CC' => $cc,
        //         'X-Mailer' => 'PHP/' . phpversion(),
        //         'Content-Type' => 'text/html; charset=ISO-8859-1'
        //     );
        
        //     mail($to, $subject, $mail->Body, $headers);
        // }
        //END Confirmation email to customer 

    echo json_encode(array("insertId" => $last_id));
    } catch (PDOException $e){
        $database->pdo->rollBack();
        http_response_code(500);
        die($e->getMessage());
    }
    