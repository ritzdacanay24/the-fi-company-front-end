<?php

use PHPMailer\PHPMailer\PHPMailer;

function dynamicInsert($table_name, $assoc_array){
    $keys = array();
    $values = array();
    foreach($assoc_array as $key => $value){
        $keys[] = $key;
        $values[] = $value;
    }
    $query = "INSERT INTO `$table_name`(`".implode("`,`", $keys)."`) VALUES('".implode("','", $values)."')";
    return $query;
}

function dynamicUpdate($table, $data, $id){
    $cols = array();
    foreach($data as $key=>$val) {
        $cols[] = "$key = '$val'";
    }
    $sql = "UPDATE $table SET " . implode(', ', $cols) . " WHERE id = $id";
    return($sql);
}



function generateRandomString222($length = 10) {
    $randomString = sha1(uniqid(rand(), true));
    $randomString = substr($randomString, 0, $length);
 
    return md5(time()).$randomString;
 }

class FieldServiceRequest
{

    protected $db;

    public function __construct($db)
    {
        $this->db = $db;
    }

    public function insert($post){
        $post['token'] = generateRandomString222(50);
		//$qry = dynamicInsert('fs_request',  $post);

        function isDataSet($data){
            return $data;
        }

        $type_of_service = isDataSet($post['type_of_service']);
        $date_of_service = isDataSet($post['date_of_service']);
        $dateAndTime = isDataSet($post['dateAndTime']);
        $start_time = isDataSet($post['start_time']);
        $so_number = isDataSet($post['so_number']);
        $customer_co_number = isDataSet($post['customer_co_number']);
        $type_of_sign = isDataSet($post['type_of_sign']);
        $eyefi_customer_sign_part = isDataSet($post['eyefi_customer_sign_part']);
        $sign_theme = isDataSet($post['sign_theme']);
        $onsite_customer_name = isDataSet($post['onsite_customer_name']);
        $onsite_customer_phone_number = isDataSet($post['onsite_customer_phone_number']);
        $property = isDataSet($post['property']);
        $address1 = isDataSet($post['address1']);
        $address2 = isDataSet($post['address2']);
        $state = isDataSet($post['state']);
        $city = isDataSet($post['city']);
        $zip = isDataSet($post['zip']);
        $licensing_required = isDataSet($post['licensing_required']);
        $ceiling_height = isDataSet($post['ceiling_height']);
        $bolt_to_floor = isDataSet($post['bolt_to_floor']);
        $special_instruction = isDataSet($post['special_instruction']);
        $created_date = isDataSet($post['created_date']);
        $requested_by = isDataSet($post['requested_by']);
        $customer = isDataSet($post['customer']);
        $platform = isDataSet($post['platform']);
        $email = isDataSet($post['email']);
        $token = isDataSet($post['token']);
        $sign_jacks = isDataSet($post['sign_jacks']);
        $serial_number = isDataSet($post['serial_number']);
        $gRecaptchaResponse = isDataSet(ISSET($post["g-recaptcha-response"]) ? $post["g-recaptcha-response"] : true);
        $subject = isDataSet($post['subject']);
        $cc_email = ISSET($post['cc_email']) ? implode(',', $post['cc_email']) : '';
        
        $sign_manufacture = ISSET($post['sign_manufacture']) ? $post['sign_manufacture'] : '';
        $site_survey_requested = ISSET($post['site_survey_requested']) ? $post['site_survey_requested'] : null;
        $lat = ISSET($post['lat']) ? $post['lat'] : null;
        $lon = ISSET($post['lon']) ? $post['lon'] : null;
        $customer_product_number = ISSET($post['customer_product_number']) ? $post['customer_product_number'] : null;
        $active = ISSET($post['active']) ? $post['active'] : 1;
        $created_by = (ISSET($post['created_by']) && $post['created_by'] !== '') ? intval($post['created_by']) : null;

        

        $qry = "
            INSERT INTO eyefidb.fs_request(
                type_of_service,
                date_of_service,
                dateAndTime,
                start_time,
                so_number,
                customer_co_number,
                type_of_sign,
                eyefi_customer_sign_part,
                sign_theme,
                onsite_customer_name,
                onsite_customer_phone_number,
                property,
                address1,
                address2,
                state,
                city,
                zip,
                licensing_required,
                ceiling_height,
                bolt_to_floor,
                special_instruction,
                created_date,
                requested_by,
                customer,
                platform,
                email,
                token,
                sign_jacks,
                serial_number,
                gRecaptchaResponse,
                subject,
                cc_email,
                sign_manufacture,
                site_survey_requested,
                lat,
                lon,
                customer_product_number,
                active,
                created_by

            ) 
            VALUES (
                :type_of_service,
                :date_of_service,
                :dateAndTime,
                :start_time,
                :so_number,
                :customer_co_number,
                :type_of_sign,
                :eyefi_customer_sign_part,
                :sign_theme,
                :onsite_customer_name,
                :onsite_customer_phone_number,
                :property,
                :address1,
                :address2,
                :state,
                :city,
                :zip,
                :licensing_required,
                :ceiling_height,
                :bolt_to_floor,
                :special_instruction,
                :created_date,
                :requested_by,
                :customer,
                :platform,
                :email,
                :token,
                :sign_jacks,
                :serial_number,
                :gRecaptchaResponse,
                :subject,
                :cc_email,
                :sign_manufacture,
                :site_survey_requested,
                :lat,
                :lon,
                :customer_product_number,
                :active,
                :created_by
            )
        ";
        $stmt = $this->db->prepare($qry);

        $stmt->bindParam(":type_of_service", $type_of_service);
        $stmt->bindParam(":date_of_service", $date_of_service);
        $stmt->bindParam(":dateAndTime", $dateAndTime);
        $stmt->bindParam(":start_time", $start_time);
        $stmt->bindParam(":so_number", $so_number);
        $stmt->bindParam(":customer_co_number", $customer_co_number);
        $stmt->bindParam(":type_of_sign", $type_of_sign);
        $stmt->bindParam(":eyefi_customer_sign_part", $eyefi_customer_sign_part);
        $stmt->bindParam(":sign_theme", $sign_theme);
        $stmt->bindParam(":onsite_customer_name", $onsite_customer_name);
        $stmt->bindParam(":onsite_customer_phone_number", $onsite_customer_phone_number);
        $stmt->bindParam(":property", $property);
        $stmt->bindParam(":address1", $address1);
        $stmt->bindParam(":address2", $address2);
        $stmt->bindParam(":state", $state);
        $stmt->bindParam(":city", $city);
        $stmt->bindParam(":zip", $zip);
        $stmt->bindParam(":licensing_required", $licensing_required);
        $stmt->bindParam(":ceiling_height", $ceiling_height);
        $stmt->bindParam(":bolt_to_floor", $bolt_to_floor);
        $stmt->bindParam(":special_instruction", $special_instruction);
        $stmt->bindParam(":created_date", $created_date);
        $stmt->bindParam(":requested_by", $requested_by);
        $stmt->bindParam(":customer", $customer);
        $stmt->bindParam(":platform", $platform);
        $stmt->bindParam(":email", $email);
        $stmt->bindParam(":token", $token);
        $stmt->bindParam(":sign_jacks", $sign_jacks);
        $stmt->bindParam(":serial_number", $serial_number);
        $stmt->bindParam(":gRecaptchaResponse", $gRecaptchaResponse);
        $stmt->bindParam(":subject", $subject);
        $stmt->bindParam(":cc_email", $cc_email);
        $stmt->bindParam(":sign_manufacture", $sign_manufacture);
        $stmt->bindParam(":site_survey_requested", $site_survey_requested);
        $stmt->bindParam(":lat", $lat);
        $stmt->bindParam(":lon", $lon);
        $stmt->bindParam(":customer_product_number", $customer_product_number);
        $stmt->bindParam(":active", $active);
        $stmt->bindParam(":created_by", $created_by);
        $stmt->execute();
        

        $insertId =  $this->db->lastInsertId();  
        return array("id" => $insertId, "token" =>$post['token']);
	}

	public function update($id, $post)
	{
		$qry = dynamicUpdate('fs_request', $post, $id);
        $query = $this->db->prepare($qry);
        $query->execute();
        return $post;   
    
	}

    public function __destruct()
    {
        $this->db = null;
    }
}

use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$post = json_decode(file_get_contents('php://input'), true);

$secret = '6LcXE3MoAAAAAD73RJuKg48sCdy1Y4eF-YIA_IQC';

//$response = ISSET($post["g-recaptcha-response"]) ? $post["g-recaptcha-response"] : true;
//$verify = file_get_contents("https://www.google.com/recaptcha/api/siteverify?secret={$secret}&response={$response}");

    $captcha_success = null;
    $sendEmail = ISSET($_GET['sendEmail']) ? $_GET['sendEmail'] : true;


try {

    $deleteSessions = new FieldServiceRequest($db);
    $data = $deleteSessions->insert($post);

    $data['g-recaptcha-response-success'] = $captcha_success;
    $link       = 'https://dashboard.eye-fi.com/dist/web/request?token=' . $data['token'] ;
    //$link1       = 'https://dashboard.eye-fi.com/dist/fsm/new-web/field-service/request/edit?selectedViewType=Open&id=' . $data['id'] ;
    //$link       = 'http://localhost:4201/request?token=' . $data['token'] ;
    $linkUsers       = 'https://dashboard.eye-fi.com/dist/web/field-service/request/edit?selectedViewType=Open&id=' . $data['id'] ;

    $msg = "
        Hello,  <br><br>

        This is a quick email to say we have received your request. 

        Please click <a href='{$link}'> here </a> to view your request. <br><br>

        <hr/>

        Field serivce schedulers, please click <a href='{$linkUsers}'> here </a> to view request.
    ";

    
    $mail = new PHPMailer(true);
    $mail->isHTML(true);
        $mail->CharSet = 'UTF-8';
    $mail->setFrom('noreply@the-fi-company.com', 'DB The-Fi-Company');
    $mail->Subject = $post['subject'];


    $email_notification = explode(',', emailNotification('field_service_comment_notification_request_form'));

    $toEmail = [$post['email']];

    $to = array_merge($toEmail, $email_notification);

    $to      = implode(',', $to);

    $to = explode(',', $to);
    foreach ($to as $address) {
        $mail->AddAddress($address);
    }
       
    if($post['cc_email'] != ""){
        $cc      = implode(',', $post['cc_email']);
        $cc = explode(',', $cc);
        foreach ($cc as $address) {
            $mail->addCC($address);
        }
    }
       
    $mail->addBCC('ritz.dacanay@the-fi-company.com');

    $mail->Body = '<html><body>';
    $mail->Body .= "Details<br/>";
    $mail->Body .= "Request ID: " . $data['id'] . "<br/>";
    $mail->Body .= "Request Date of Service: " . $post['date_of_service']. "<br/>";
    $mail->Body .= "Request Time of Service: " . $post['start_time']. "<br/>";
    $mail->Body .= "Customer CO: " . $post['customer_co_number']. "<br/>";
    $mail->Body .= "SO #: " . $post['so_number']. "<br/>";
    $mail->Body .= "Property: " . $post['property']. "<br/>";
    $mail->Body .= "state: " . $post['state']. "<br/>";
    $mail->Body .= "city: " . $post['city']. "<br/>";
    $mail->Body .= "<br><br>";

    $mail->Body .= $msg;
    $mail->Body .= "<br>";
    $mail->Body .= "</body></html>";

    if($sendEmail == true || $sendEmail == 'true'){
        $mail->send();
    }

    echo json_encode($data);

} catch (PDOException $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'error' => true,
        'message' => $e->getMessage(),
        'code' => $e->getCode(),
        'trace' => $e->getTraceAsString()
    ]);
    exit;
} catch (Exception $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'error' => true,
        'message' => $e->getMessage(),
        'code' => $e->getCode()
    ]);
    exit;
}