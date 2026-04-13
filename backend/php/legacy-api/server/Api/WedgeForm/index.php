<?php

use EyefiDb\Api\WedgeForm\WedgeForm;
use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Config\Protection;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new WedgeForm($db);
$data->nowDate = date("Y-m-d H:i:s", time());
$data->sessionId = $userInfo->id;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // The request is using the POST method

    $post = json_decode(file_get_contents('php://input'), true);

    if (isset($post['create'])) {
        $results = $data->create($post);
    }

    echo json_encode($results);
} else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // The request is using the GET method

    if (isset($_GET['getByWorkOrderNumber'])) {
        $results = $data->getByWorkOrderNumber($_GET['workOrderNumber']);
    }

    echo json_encode($results);
} else {
    http_response_code(500);
    die('Unauthorized');
}
