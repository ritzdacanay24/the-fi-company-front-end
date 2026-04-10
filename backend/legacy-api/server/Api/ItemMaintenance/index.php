<?php

use EyefiDb\Api\ItemMaintenance\ItemMaintenance;
use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Databases\DatabaseQad;
use EyefiDb\Config\Protection;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();

$data = new ItemMaintenance($dbQad, $db);
$data->nowDate = date("Y-m-d H:i:s", time());
$data->sessionId = $userInfo->id;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // The request is using the POST method

    $post = json_decode(file_get_contents('php://input'), true);

    echo json_encode($results);
} else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // The request is using the GET method

    if (isset($_GET['getPartNumbers'])) {
        $results = $data->getPartNumbers();
    }

    echo $db_connect->json_encode($results);
} else {
    http_response_code(500);
    die('Unauthorized');
}
