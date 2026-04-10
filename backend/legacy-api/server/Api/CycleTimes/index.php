<?php

use EyefiDb\Api\CycleTimes\CycleTimesProduction111 as CycleTimesProduction;
use EyefiDb\Api\CycleTimes\CycleTimesShipping;
use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Databases\DatabaseQad;
use EyefiDb\Config\Protection;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_LOWER);

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();
$dbQad->setAttribute(PDO::ATTR_CASE, PDO::CASE_LOWER);

$productionInstance = new CycleTimesProduction($dbQad, $db);
$productionInstance->nowDate = date("Y-m-d H:i:s", time());
$productionInstance->user_full_name = $userInfo->full_name;

$shippingInstance = new CycleTimesShipping($dbQad, $db);
$shippingInstance->nowDate = date("Y-m-d H:i:s", time());
$shippingInstance->user_full_name = $userInfo->full_name;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // The request is using the POST method

    $post = json_decode(file_get_contents('php://input'), true);

    if (isset($post['update'])) {
        $results = $productionInstance->update($post);
    }

    if (isset($post['saveWeeklyUsers'])) {
        $results = $productionInstance->saveWeeklyUsers($post['details']);
    }
    echo json_encode($results);
} else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // The request is using the GET method

    if (isset($_GET['getProductionCycleTimes'])) {
        $results = $productionInstance->runData();
    }
    if (isset($_GET['getShippingCycleTimes'])) {
        $results = $shippingInstance->cycleTimes();
    }
    if (isset($_GET['cycleTimesDaily'])) {
        $results = $productionInstance->runDailyReport($_GET['dateFrom'],$_GET['dateTo']);
    }
    
    if (isset($_GET['view']) && $_GET['view'] == 'Shipping') {
        $results = $shippingInstance->cycleTimesEdit();
    } else if (isset($_GET['view']) && $_GET['view'] == 'Production') {
        $results = $productionInstance->editAddCycleTimes();
    }


    echo $db_connect->json_encode($results);
} else {
    http_response_code(500);
    die('Unauthorized');
}
