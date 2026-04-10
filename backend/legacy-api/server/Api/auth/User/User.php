<?php

include_once __DIR__ . '/User.php';

use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

// prepare user object
$userInstance = new User($db);

// get id of user to be edited
$data = json_decode(file_get_contents('php://input'), true);

if (isset($data['updateEmail'])) {
    $res =  $userInstance->updateEmail($data);
    echo json_encode($res);
}

if (isset($data['updateUser'])) {
    $res =  $userInstance->update($data);
    echo json_encode($res);
}
