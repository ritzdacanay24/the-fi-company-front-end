<?php
    require '/var/www/html/server/Databases/DatabaseEyefiV1.php';
    
    
use EyefiDb\Databases\DatabaseEyefi;
use PHPMailer\PHPMailer\PHPMailer;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);


    $_POST = json_decode(file_get_contents("php://input"), true);

    $table_name = "safety_incident";

    $mainQry = "
        select *
        from safety_incident
        where id = :id
    ";
    $query = $db->prepare($mainQry);
    $query->bindParam(':id', $_GET['id'], PDO::PARAM_STR);
    $query->execute();
    $results =  $query->fetch(PDO::FETCH_ASSOC);

    if(
        ISSET($_POST['corrective_action_owner_user_email']) && $results['corrective_action_owner_user_email'] != $_POST['corrective_action_owner_user_email']){
    
        
            

            $emailUsers         = $_POST['corrective_action_owner_user_email'];

            
        $mail = new PHPMailer(true);
        $mail->isHTML(true);
            $mail->CharSet = 'UTF-8';
        $mail->setFrom('noreply@the-fi-company.com', 'DB The-Fi-Company');
        $mail->Subject = "Safety Incident - " . $_GET['id'];

        $addresses = explode(',', $emailUsers);
        foreach ($addresses as $address) {
            $mail->AddAddress($address);
        }
        $mail->addCC("ritz.dacanay@the-fi-company.com");
               

            $link = "https://dashboard.eye-fi.com/dist/web/operations/forms/safety-incident/edit?id=" .  $_GET['id'];

            $mail->Body = '<html><body>';

            $mail->Body .= 'You are now assigned to this safety incident. Please click <a href="' . $link . '">here</a> to view the Safety Incident details. <br> <br>';
            $mail->Body .= "</body></html>";

            $mail->send();
        }

        $data = $database->update($table_name, $_POST, [
            "id" => $_GET['id']
        ]);
    
            

    echo json_encode(array("rowCount" => $data->rowCount(), "results" => $results));