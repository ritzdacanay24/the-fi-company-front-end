<?php

include_once __DIR__ . '/login.class.php';

use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
use \Firebase\JWT\JWT;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

// prepare user object
$login = new Login($db);

// get data from request
$data = $_POST;

// Get JSON data if POST is empty
if (empty($data)) {
    $angularJSData = json_decode(file_get_contents("php://input"), true);
    if ($angularJSData) {
        $data = $angularJSData;
    } else {
        echo json_encode(array(
            "access_token" => false,
            "message" => "No data received", 
            "data" => "",
            "status" => 'error',
            "status_code" => 0
        ));
        die();
    }
}

// Validate required fields - only card_number needed
if (empty($data['card_number'])) {
    echo json_encode(array(
        "access_token" => false,
        "message" => "Card number is required", 
        "data" => "",
        "status" => 'error',
        "status_code" => 0
    ));
    die();
}

// Set card number for lookup
$login->card_number = $data['card_number'];
$login->created_at = date('Y-m-d H:i:s');

// Call card number login method
$row_data = $login->LoginByCardNumber();

if ($row_data) {

    $row = (object) $row_data;

    if ($row->active == 0) {
        echo json_encode(array(
            "access_token" => false,
            "message" => "You have been deactivated. Please contact the administrator.",
            "data" => "",
            "name" => "",
            "status" => 'warning',
            "status_code" => 0
        ));
        die();
    } else if ($row->access == 0) {
        echo json_encode(array(
            "access_token" => false,
            "message" => 'Account is locked. Please contact the administrator.',
            "data" => "",
            "name" => "",
            "status" => 'warning',
            "status_code" => 0
        ));
        die();
    } else if ($row->access == 1 && $row->active == 1) {

        // Card number authentication - just verify card exists and user is valid
        // No password check needed, no attempt counting for card auth
        $login->updateLogin($row->id);

        $secret_key = APP_SECRET_KEY;
        $issuer_claim = APP_NAME;
        $audience_claim = JWT_AUD_CLAIM;
        $issuedat_claim = time();
        $notbefore_claim = $issuedat_claim + JWT_NOT_BEFORE;
        $expire_claim = $issuedat_claim + JWT_EXP;
        $token = array(
            "iss" => $issuer_claim,
            "aud" => $audience_claim,
            "iat" => $issuedat_claim,
            "nbf" => $notbefore_claim,
            "exp" => $expire_claim,
            "data" => array(
                "id" => (int)$row->id,
                "full_name" => $row->name,
                "email" => $row->email,
                "card_number" => $row->card_number,
                "image" => $row->image,
                "roles" => $row->roles,
                "type" => (int)$row->type,
                "first_name" => $row->first,
                "last_name" => $row->last,
                "employeeType" => (int)$row->employeeType,
                "workArea" => $row->workArea,
                "company_id" => $row->company_id, 
                "isAdmin" => (int)$row->admin,
                "enableTwostep" => (int)$row->enableTwostep,
                "auth_method" => 'card_number'
            )
        );

        $jwt = JWT::encode($token, $secret_key);

        echo json_encode(array(
            "access_token" => $jwt,
            "message" => "Successfully logged in via card number",
            "status" => 'success',
            "status_code" => 1,
            "user" => array(
                "id" => (int)$row->id,
                "full_name" => $row->name,
                "email" => $row->email,
                "card_number" => $row->card_number,
                "image" => $row->image,
                "roles" => $row->roles,
                "type" => (int)$row->type,
                "first_name" => $row->first,
                "last_name" => $row->last,
                "employeeType" => (int)$row->employeeType,
                "workArea" => $row->workArea,
                "company_id" => $row->company_id,
                "token" => $jwt,
                "isAdmin" => (int)$row->admin,
                "enableTwostep" => (int)$row->enableTwostep,
                "auth_method" => 'card_number'
            )
        ));

    } else {
        echo json_encode(array(
            "access_token" => "",
            "message" => "Account status invalid",
            "data" => "",
            "name" => "",
            "status" => 'danger',
            "status_code" => 0
        ));
    }
}
else {
    // Card number not found or invalid
    echo json_encode(array(
        "access_token" => "",
        "message" => "Invalid card number.",
        "data" => "",
        "name" => "",
        "status" => 'danger',
        "status_code" => 0
    ));
}

?>
