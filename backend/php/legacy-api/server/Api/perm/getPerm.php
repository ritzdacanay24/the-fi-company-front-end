<?php

use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Api\perm\Perm;

$page = isset($_GET['page']);
$userId = isset($_GET['userId']);

if ($page && $userId) {

    $db_connect = new DatabaseEyefi();
    $db = $db_connect->getConnection();
    $db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

    $data = new Perm($db);

    $results = $data->getPerm($_GET['page'], $_GET['userId']);

    echo $db_connect->json_encode($results);
} else {
    echo json_encode([
        "message" => "Invalid Parameters"
    ]);
    ___http_response_code(500);
}
