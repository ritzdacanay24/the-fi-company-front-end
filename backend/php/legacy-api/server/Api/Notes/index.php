<?php

use EyefiDb\Api\Notes\Notes;
use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Config\Protection;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new Notes($db);
$data->sessionId = $userInfo->id;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    $post = json_decode(file_get_contents('php://input'), true);

    if (isset($post['insert'])) {
        $results = $data->insert($post);
    }
    echo json_encode($results);
}else if ($_SERVER['REQUEST_METHOD'] === 'GET') {

    if (isset($_GET['getById'])) {
        $results = $data->getById($_GET['so'], $_GET['userId']);
    }

    echo json_encode($results);
}else{
    http_response_code(500);
    die('Unauthorized');
}
