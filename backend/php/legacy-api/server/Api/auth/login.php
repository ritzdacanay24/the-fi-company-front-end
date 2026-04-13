<?php
header('Access-Control-Allow-Origin: *');

header('Access-Control-Allow-Methods: GET, POST');

header("Access-Control-Allow-Headers: X-Requested-With");

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
if (
    empty($data['password']) ||
    empty($data['email'])
) {
    echo json_encode(array("message" => "Incomplete Information","data" => $_POST));
    die();
}

// set user property values
$login->email = $data['email'];
$login->password = $data['password'];
$login->created_at = date('Y-m-d H:i:s');

$row_data = $login->Login();

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
            "message" => 'Due to inactivity of ' . $row->daysOfInactivity . ' days, your account has been locked. ',
            "data" => "",
            "name" => "",
            "status" => 'warning',
            "status_code" => 0
        ));
        die();
    }  else if (($row->access == 1) && $row->active == 1) {

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
                    "id" => $row->id,
                    "full_name" => $row->name,
                    "email" => $row->email,
                    "image" => $row->image,
                    "roles" => $row->roles,
                    "type" => $row->type,
                    "workArea" => $row->workArea,
                    "isAdmin" => $row->admin
                )
            );

            // tell the user they are logged in
            $jwt = JWT::encode($token, $secret_key);

            $token['data']['token'] = $jwt;

            echo json_encode(array(
                "access_token" => $jwt,
                "message" => "Successfully logged in...",
                "status" => 'success',
                "status_code" => 1
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
