<?php
    use EyefiDb\Databases\DatabaseEyefi;
    use PHPMailer\PHPMailer\PHPMailer;
    

    $db_connect = new DatabaseEyefi();
    $db = $db_connect->getConnection();
    $db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);
    $db->setAttribute(PDO::ATTR_ORACLE_NULLS, PDO::NULL_EMPTY_STRING);

    require "/var/www/html/server/Api/FieldServiceMobile/functions/index.php";

    $_POST = json_decode(file_get_contents("php://input"), true);

    $table = 'fs_parts_order';

    $qry = dynamicUpdate($table, $_POST, $_GET['id']);
    $id = $_GET['id'];  
    
    $query = $db->prepare($qry);
    $query->execute();

      $emailUsers = "ritz.dacanay@the-fi-company.com, juvenal.torres@the-fi-company.com, orderslv@the-fi-company.com";
      //$to = "ritz.dacanay@the-fi-company.com";

      $nowDate = date("Y-m-d", time());
  
      $mail = new PHPMailer(true);
      $mail->isHTML(true);
          $mail->CharSet = 'UTF-8';
      $mail->setFrom('noreply@the-fi-company.com', 'DB The-Fi-Company');
      $mail->Subject = "ID - " . $id . " Parts Order - " . $nowDate;

      $addresses = explode(',', $emailUsers);
      foreach ($addresses as $address) {
          $mail->AddAddress($address);
      }
         
  
      $link = "https://dashboard.eye-fi.com/dist/web/field-service/parts-order/edit?id=". $id;
   
      
      $oem = $_POST['oem'];
      $casino_name = $_POST['casino_name'];
      $shipping_method = $_POST['arrival_date'];
      $address = $_POST['address'];
      $contact_name = $_POST['contact_name'];
      $contact_phone_number = $_POST['contact_phone_number'];
      // $billable = $_POST['billable'];
      $part_number = $_POST['part_number'];
      $part_qty = $_POST['part_qty'];
      $instructions = $_POST['instructions'];
      $so_number = $_POST['so_number'];

      //This the email sent to the customer. 

      $mail->Body = '<html><body>';
      
      $mail->Body .= 'Parts Order Request <br/><br/>';
      $mail->Body .= "SV Number: $so_number <br/><br/>";
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
  
  
      $mail->Body .= "Please click <a href='{$link}' target='_parent'> here </a> to view request.";
  
  
      $mail->Body .= "</body></html>";
      $mail->send();
  
      ///email
  
  echo json_encode(array("insertId" => $id));
  
  