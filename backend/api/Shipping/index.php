<?php

use EyefiDb\Api\Shipping\Shipping;
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
$dbQad->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$data = new Shipping($db, $dbQad);
$data->nowDate = date("Y-m-d H:i:s", time());
$data->sessionId = $userInfo->id;
$data->user_full_name = $userInfo->full_name;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // The request is using the POST method

    $post = json_decode(file_get_contents('php://input'), true);

    if (isset($post['shippingMisc'])) {
        $results = $data->saveMisc($post);
    }
    if (isset($_GET['saveMiscArray'])) {
        foreach($post as $row){
            $results[] = $data->saveMisc($row);
        }
    }
    if (isset($_GET['automatedIGTTransfer'])) {
        $data->automatedIGTTransfer($post);
    }

    echo $db_connect->json_encode($results);
} else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // The request is using the GET method

    if (isset($_GET['runOpenShippingReport'])) {
        $results = $data->runOpenShippingReport();
    }
    if (isset($_GET['shippingChanges'])) {
        $results = $data->shippingChanges($_GET['shippingChanges']);
    }
    if (isset($_GET['shippingChangesReport'])) {
        $results = $data->shippingChangesReport($_GET['shippingChangesReport']);
    }
    if (isset($_GET['shippingChangesAll'])) {
        $results = $data->shippingChangesAll($_GET['shippingChangesAll']);
    }
    if (isset($_GET['getLineNumbers'])) {
        $results = $data->getLineNumbers($_GET['getLineNumbers']);
    }

    if (isset($_GET['getProductionCommitDateChangeCount'])) {
        $results = $data->getProductionCommitDateChangeCount($_GET['getProductionCommitDateChangeCount']);
    }

    echo $db_connect->json_encode($results);
} else {
    http_response_code(500);
    die('Unauthorized');
}
