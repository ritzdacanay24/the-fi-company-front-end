<?php

use EyefiDb\Api\ForkLiftInspection\ForkLiftInspection;
use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Config\Protection;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new ForkLiftInspection($db);
$data->nowDate = date("Y-m-d H:i:s", time());
$data->sessionId = $userInfo->id;

// if ($_SERVER['REQUEST_METHOD'] === 'POST') {
//     // The request is using the POST method

    

// } else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
//     // The request is using the GET method

    

// } else {
//     http_response_code(500);
//     die('Unauthorized');
// }

if (isset($_GET['getAll'])) {
    $results = $data->getAll();
}

if (isset($_GET['searchById'])) {
    $results = $data->searchById($_GET['searchById']);
}
$post = json_decode(file_get_contents('php://input'), true);

    if (isset($post['create'])) {
        $results = $data->create($post);
    }
    echo $db_connect->json_encode($results);