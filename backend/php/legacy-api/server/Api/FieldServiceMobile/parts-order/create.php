<?php
    use EyefiDb\Databases\DatabaseEyefi;

    $db_connect = new DatabaseEyefi();
    $db = $db_connect->getConnection();
    $db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);
    $db->setAttribute(PDO::ATTR_ORACLE_NULLS, PDO::NULL_EMPTY_STRING);

    use PHPMailer\PHPMailer\PHPMailer;

    require "/var/www/html/server/Api/FieldServiceMobile/functions/index.php";

    
    $db->beginTransaction();

    try {
    $_POST = json_decode(file_get_contents("php://input"), true);

    $table = 'fs_parts_order';

    if($_POST['oem']['cm_addr']){
        $_POST['oem'] = $_POST['oem']['cm_addr'];
    }
    $oem = $_POST['oem'];

    $qry = dynamicInsert($table, $_POST);
    
    $query = $db->prepare($qry);
    $query->execute();

    $id = $db->lastInsertId();
    
    $emailUsers = "ritz.dacanay@the-fi-company.com, juvenal.torres@the-fi-company.com, orderslv@the-fi-company.com";
    //$to = "ritz.dacanay@the-fi-company.com";

    $nowDate = date("Y-m-d", time());

    $link = "https://dashboard.eye-fi.com/dist/web/field-service/parts-order/edit?id=". $id;
 
    
    $mail = new PHPMailer(true);
    $mail->isHTML(true);
            $mail->CharSet = 'UTF-8';
    $mail->setFrom('noreply@the-fi-company.com', 'DB The-Fi-Company');
    $mail->Subject = "ID - " . $id . " Parts Order - " . $nowDate;

    $addresses = explode(',', $emailUsers);
    foreach ($addresses as $address) {
        $mail->AddAddress($address);
    }
            

    $mail->Body = '<html><body>';

    $casino_name = $_POST['casino_name'];
    $shipping_method = $_POST['arrival_date'];
    $address = $_POST['address'];
    $contact_name = $_POST['contact_name'];
    $contact_phone_number = $_POST['contact_phone_number'];
    // $billable = $_POST['billable'];
    $part_number = $_POST['part_number'];
    $part_qty = $_POST['part_qty'];
    $instructions = $_POST['instructions'];
    $details = $_POST['details'];

    $mail->Body .= 'Parts Order Request <br/><br/>';
    $mail->Body .= "Parts Order ID #: $id <br/>";
    $mail->Body .= "OEM: $oem <br/>";
    $mail->Body .= "Casino Name: $casino_name <br/>";
    $mail->Body .= "Arrival Date: $shipping_method <br/>";
    $mail->Body .= "Address: $address <br/>";
    $mail->Body .= "Contact: $contact_name <br/>";
    $mail->Body .= "Contact Phone Number: $contact_phone_number <br/>";
    // $mail->Body .= "Billable: $billable <br/>";
    // $mail->Body .= "Part: $part_number <br/>";
    // $mail->Body .= "Qty: $part_qty <br/><br/><br/>";
    $mail->Body .= "$instructions <br/><br/>";

    if($details){
        $mail->Body .= "Parts <br/><br/>";
        $mail->Body .= '<table rules="all" style="border-color: #666;" cellpadding="5" border="1">';
		$mail->Body .= "<tr style='background: #eee;'>";
		$mail->Body .= "<td><strong>Part Number</strong></td>";
		$mail->Body .= "<td><strong>Billable</strong></td>";
		$mail->Body .= "<td><strong>Qty</strong></td>";
		$mail->Body .= "</tr>";
        $d = json_decode($details, true);
        foreach($d as $row){
            $mail->Body .= "<tr>"; 
                $mail->Body .= "<td>" . $row['part_number'] . "</td>"; 
                $mail->Body .= "<td>" . $row['billable'] . "</td>"; 
                $mail->Body .= "<td>" . $row['qty'] . "</td>"; 
            $mail->Body .= "</tr>"; 
        }

        $mail->Body .= "</table> <br/><br/>";
    }

    $mail->Body .= "Please click <a href='{$link}' target='_parent'> here </a> to view request.";


    $mail->Body .= "</body></html>";
    
    $mail->send();
    ///email

    
    $db->commit();

    echo json_encode(array("insertId" => $id));
} catch (PDOException $e) {
    $db->rollBack();
    http_response_code(400);
    echo json_encode($e->getMessage());

}
