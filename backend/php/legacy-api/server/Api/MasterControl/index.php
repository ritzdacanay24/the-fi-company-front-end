<?php
require_once __DIR__ . '/../../../vendor/autoload.php';

use EyefiDb\Api\MasterControl\MasterControl;
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

$data = new MasterControl($dbQad, $db);
$data->nowDate = date("Y-m-d H:i:s", time());
$data->sessionId = $userInfo->id;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // The request is using the POST method

    $post = json_decode(file_get_contents('php://input'), true);

    if (isset($post['print'])) {
        $results = $data->savePrinted($post);
    }

    if (isset($_GET['update_production_order'])) {
        $results = $data->updateProductionOrder($post);
    }

    echo json_encode($results);
} else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // The request is using the GET method

    
    
    if (isset($_GET['line'])) {
        $results = $data->getPerformance($_GET['line']);
    }
    if (isset($_GET['getMasterProductionReport'])) {
        $results = $data->routing('10,20,30', 'true');
    }

    if (isset($_GET['getMasterProductionReportByRouting'])) {
        if($_GET['routing'] == 10){
            $results = $data->routing(10, 'false');
        }else if($_GET['routing'] == 20){
            $results = $data->routing(20, 'false');
        }else if($_GET['routing'] == 30){
            $results = $data->routing(30, 'false');
        }else if($_GET['routing'] == 40){
            $results = $data->routing(40, 'false');
        }else if($_GET['routing'] == 50){
            $results = $data->routing(50, 'false');
        }else{
            $results = $data->routing('10,20,30,40,50', 'true');
        }
    }

    if (isset($_GET['getPickingReport'])) {
        $results = $data->routing(10, 'false');
    }

    if (isset($_GET['getProductionInfo'])) {
        $results = $data->routing(20, 'false');
    }

    if (isset($_GET['getQcFinalTest'])) {
        $results = $data->routing(30, 'false');
    }

    if (isset($_GET['getRoutingConfig'])) {
        $results = $data->routing(30, 'false');
    }

    if (isset($_GET['getPickDetailsByWorkOrderNumber'])) {
        if (!isset($_GET['filteredSections'])) {
            $filteredSections = 0;
        } else {
            $filteredSections = $_GET['filteredSections'];
        }
        $results = $data->getPickDetailsByWorkOrderNumber($_GET['workOrderNumber'], $filteredSections);
    }

    echo $db_connect->json_encode($results);
} else {
    http_response_code(500);
    die('Unauthorized');
}
