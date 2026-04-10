<?php

include_once __DIR__ . '/login.class.php';

use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
use \Firebase\JWT\JWT;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

// prepare user object
$login = new Login($db);

// get id of user to be edited
$data = $_POST;

// required fields

// Check if this is card number authentication
$isCardAuth = !empty($data['card_number']);

// Validate required fields based on authentication method
if ($isCardAuth) {
    // Card number authentication - only card_number required
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
} else  if (
    empty($data['password']) ||
    empty($data['email'])
) {
    $angularJSData = json_decode(file_get_contents("php://input"), true);
    if ($angularJSData) {
        $data = $angularJSData;
    } else {
        echo json_encode(array("message" => "Incomplete Information", "data" => $angularJSData));
        die();
    }
}



// set user property values
$login->email = $data['email'];
$login->password = $data['password'];
$login->created_at = date('Y-m-d H:i:s');

$row_data = $login->Login();



// Set user property values based on authentication method
if ($isCardAuth) {
    // Card number authentication
    $login->card_number = $data['card_number'];
    $login->created_at = date('Y-m-d H:i:s');
    
    // Call card number login method (you'll need to add this to login.class.php)
    $row_data = $login->LoginByCardNumber();
} else {
    // Traditional email/password authentication
    $login->email = $data['email'];
    $login->password = $data['password'];
    $login->created_at = date('Y-m-d H:i:s');
    
    // Call traditional login method
    $row_data = $login->Login();
}

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
    }else if ($row->access == 1 && $row->active == 1) {

        if (
            $row->pass == hash(APP_HASH_PASS, $login->password) &&
            $row->attempts < APP_MAX_LOGIN_ATTEMPTS
        ) {

            $login->updateLogin($row->id);

            $secret_key = APP_SECRET_KEY;
            $issuer_claim = APP_NAME; // this can be the servername
            $audience_claim = JWT_AUD_CLAIM;
            $issuedat_claim = time(); // issued at
            $notbefore_claim = $issuedat_claim + JWT_NOT_BEFORE; //not before in seconds
            $expire_claim = $issuedat_claim + JWT_EXP; // expire time in seconds
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
                    "image" => $row->image,
                    "roles" => $row->roles,
                    "type" => (int)$row->type,
                    "first_name" => $row->first,
                    "last_name" => $row->last,
                    "employeeType" => (int)$row->employeeType,
                    "workArea" => $row->workArea,
                    "company_id" => $row->company_id, 
                    "isAdmin" => (int)$row->admin,
                    "enableTwostep" => (int)$row->enableTwostep
                )
            );

            // tell the user they are logged in
            $jwt = JWT::encode($token, $secret_key);

            // setcookie("THE_FI_COMPANY_TWOSTEP_TOKEN", $jwt, time() + (86400 * 30), '/', FALSE, FALSE); 

            echo json_encode(array(
                "access_token" => $jwt,
                "message" => "Successfully logged in",
                "status" => 'success',
                "status_code" => 1,
                "cookie" => $_COOKIE,
                "user" => array(
                    "id" => (int)$row->id,
                    "full_name" => $row->name,
                    "email" => $row->email,
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
                    "enableTwostep" => (int)$row->enableTwostep
                )
            ));
        } else {

            $login->updateAttempts($row->id);
            $row->attempts++;

            if (
                $row->attempts >= APP_MAX_LOGIN_ATTEMPTS &&
                $row->active
            ) {
                $login->accountLocked($row);
            } else {
                echo json_encode(array(
                    "access_token" => false,
                    "message" => 'Incorrect credentials. Please try again. ' . $row->attempts . ' of ' . APP_MAX_LOGIN_ATTEMPTS . ' attempts.',
                    "data" => "",
                    "name" => "",
                    "status" => 'warning',
                    "status_code" => 0
                ));
                die();
            }
        }
    } else {
        // tell the user
        echo json_encode(array(
            "access_token" => "",
            "message" => "Nothing defined",
            "data" => "",
            "name" => "",
            "status" => 'danger',
            "status_code" => 0
        ));
    }
}

// if unable to update the user, tell the user
else {


    // tell the user
    echo json_encode(array(
        "access_token" => "",
        "message" => "Incorrect password/email.",
        "data" => "",
        "name" => "",
        "status" => 'danger',
        "status_code" => 0
    ));

    // set response code - 503 service unavailable+
}
