<?php

use EyefiDb\Api\Shortages\Shortages;
use EyefiDb\Api\Material\Material;
use EyefiDb\Databases\DatabaseQad;
use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Config\Protection;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();
$dbQad->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new Shortages($db, $dbQad);
$data->nowDate = date("Y-m-d H:i:s", time());
$data->sessionId = $userInfo->id;
$data->full_name = $userInfo->full_name;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // The request is using the POST method
    $post = json_decode(file_get_contents('php://input'), true);

    if (isset($post['createShortages'])) {
        $results = $data->createShortages($post['data']);
    }

    if (isset($post['update'])) {
        $results = $data->update($post);
    }
    if (isset($post['updateProductionIssue'])) {
        $results = $data->updateProductionIssue($post);
    }

    echo json_encode($results);
} else if ($_SERVER['REQUEST_METHOD'] === 'GET') {

    if (isset($_GET['getShortages'])) {
        $results = $data->getShortages();
    }

    echo $db_connect->json_encode($results);
}
