<?php

use EyefiDb\Api\ShippingChecklist\ShippingChecklist;
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

$data = new ShippingChecklist($db, $dbQad);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // The request is using the POST method

    $post = json_decode(file_get_contents('php://input'), true);

    if (isset($post['insert'])) {
        $results = $data->insert($post);
    }
    if (isset($post['updateById'])) {
        $results = $data->updateById($post);
    }

    echo $db_connect->json_encode($results);
} else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // The request is using the GET method

    if (isset($_GET['getDataById'])) {
        $results = $data->getDataById($_GET['getDataById']);
    }
    if (isset($_GET['getBySoAndLine'])) {
        $results = $data->getBySoAndLine($_GET['so'], $_GET['line']);
    }
    if (isset($_GET['checkIfSalesOrderIsValid'])) {
        $results = $data->checkIfSalesOrderIsValid($_GET['checkIfSalesOrderIsValid']);
    }
    if (isset($_GET['checkIfSalesOrderIsValid'])) {
        $results = $data->checkIfSalesOrderIsValid($_GET['checkIfSalesOrderIsValid']);
    }

    if (isset($_GET['getAttachments'])) {
        $results = $data->getAttachments($_GET['getAttachments']);
    }
    if (isset($_GET['shippingChecklistReport'])) {
        $results = $data->shippingChecklistReport($_GET['shippingChecklistReport']);
    }

    echo $db_connect->json_encode($results);
} else {
    http_response_code(500);
    die('Unauthorized');
}
