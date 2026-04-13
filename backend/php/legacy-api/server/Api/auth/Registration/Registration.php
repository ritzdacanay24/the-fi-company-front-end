<?php
include_once __DIR__ . '/Registration.php';

use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;

$post = json_decode(file_get_contents('php://input'), true);

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

// prepare user object
$product = new Registration($db);

// get id of user to be edited
$data = $post;
// required fields
if(
    empty($data['code'])
){
    echo json_encode(array("message" => "Incomplete Information"));
    die();
}

// set user property values
$product->code = $data['code'];

$row_data = $product->CheckCode();

if($row_data){

    echo json_encode(array(
        "message" => "Code is valid",
        "status" => 'success',
        "status_code" => 1
    ));
}
else
{

    // tell the user
    echo json_encode(array(
        "message" => "Code invalid",
        "status" => 'danger',
        "status_code" => 0
    ));
    
}