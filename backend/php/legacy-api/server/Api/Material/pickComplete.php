<?php

use EyefiDb\Api\Material\Material;
use EyefiDb\Databases\DatabaseQad;
use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Config\Protection;

use EyefiDb\Api\Shortages\Shortages;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();
$dbQad->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new Material($db, $dbQad);
$data->nowDate = date("Y-m-d H:i:s", time());
$data->sessionId = $userInfo->id;
$data->full_name = $userInfo->full_name;

$shortageInstance = new Shortages($db, $dbQad);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // The request is using the POST method

    $post = json_decode(file_get_contents('php://input'), true);
    
    if (isset($post['pickComplete'])) {
        $results = $data->pickComplete($post['data'], $post['lineDetails'], $post['shortages'], $shortageInstance);
    }

    echo json_encode($results);
}
