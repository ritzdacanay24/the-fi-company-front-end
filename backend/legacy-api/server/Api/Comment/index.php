<?php

use EyefiDb\Api\Comment\Comment;
use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Config\Protection;


use EyefiDb\Databases\DatabaseQad as DatabaseQad;

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();
$dbQad->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new Comment($db, $dbQad);
$data->nowDate = date("Y-m-d H:i:s", time());
$data->sessionId = $userInfo->id;
$data->user_full_name = $userInfo->full_name;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // The request is using the POST method

    $post = json_decode(file_get_contents('php://input'), true);

    if (isset($post['insert'])) {
        $results = $data->create($post);
    }
    if (isset($post['deleteComment'])) {
        $results = $data->delete($post);
    }
    if (isset($post['atRiskComment'])) {
        $results = $data->atRiskComment($post);
    }

    echo $db_connect->json_encode($results);
} else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // The request is using the GET method

    if (isset($_GET['getCommentById'])) {
        $results = $data->getCommentById($_GET['getCommentById']);
    }
    if (isset($_GET['getCommentQirInvestigation'])) {
        $results = $data->getCommentQirInvestigation($_GET['getCommentQirInvestigation']);
    }

    

    echo $db_connect->json_encode($results);
} else if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    // The request is using the GET method

    $post = json_decode(file_get_contents('php://input'), true);
    
    $results = $data->update($post);
   

    echo $db_connect->json_encode($results);
} else {
    http_response_code(500);
    die('Unauthorized');
}
