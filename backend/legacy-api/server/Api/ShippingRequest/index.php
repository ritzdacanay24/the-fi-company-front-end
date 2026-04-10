<?php

use EyefiDb\Api\ShippingRequest\ShippingRequest;
use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Config\Protection;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new ShippingRequest($db);
$data->nowDate = date("Y-m-d H:i:s", time());
$data->sessionId = $userInfo->id;
$data->full_name = $userInfo->full_name;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // The request is using the POST method

    $post = json_decode(file_get_contents('php://input'), true);

    if (isset($post['createRequest'])) {
        $results = $data->createRequest($post);
    }

    if (isset($post['updateTracking'])) {
        $results = $data->updateTracking($post);
    }

    echo json_encode($results);
} else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // The request is using the GET method

    if (isset($_GET['getAll'])) {
        $results = $data->viewReport($_GET['getAll']);
    }

    if (isset($_GET['getReportByUserId'])) {
        $results = $data->getReportByUserId($_GET['byUser']);
    }

    if (isset($_GET['viewRequestById'])) {
        $results = $data->viewRequestById($_GET['viewRequestById']);
    }

    echo $db_connect->json_encode($results);
} else {
    http_response_code(500);
    die('Unauthorized');
}
