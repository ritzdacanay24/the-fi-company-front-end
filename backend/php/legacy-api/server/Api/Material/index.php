<?php

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

$data = new Material($db, $dbQad);
$data->nowDate = date("Y-m-d H:i:s", time());
$data->sessionId = $userInfo->id;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // The request is using the POST method

    $post = json_decode(file_get_contents('php://input'), true);
    if (isset($post['generateMaterialRequest'])) {
        $results = $data->generateMaterialRequest($post);
    }

    if (isset($post['updateHeaderDetails'])) {
        $results = $data->updateHeaderDetails($post);
    }

    if (isset($post['updateLineDetails'])) {
        $results = $data->updateLineDetails($post['details']);
    }

    if (isset($post['pickSheetPrint'])) {
        $results = $data->pickSheetPrint($post['mrfId'], $post['data']);
    }

    echo json_encode($results);
} else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // The request is using the GET method

    if (isset($_GET['getOpenValidationReport'])) {
        $results = $data->getOpenValidationReport();
    }

    if (isset($_GET['getOpenPicks'])) {
        $results = $data->getOpenPicks();
    }

    if (isset($_GET['getHeaderAndLineDetailsById'])) {
        $results = $data->getHeaderAndLineDetailsById($_GET['getHeaderAndLineDetailsById']);
    }

    if (isset($_GET['searchItemByQadPartNumber'])) {
        $results = $data->searchItemByQadPartNumber($_GET['searchItemByQadPartNumber']);
    }

    if (isset($_GET['getReport'])) {
        $results = $data->getReport($_GET['dateFrom'], $_GET['dateTo']);
    }

    echo $db_connect->json_encode($results);
} else {
    http_response_code(500);
    die('Unauthorized');
}
