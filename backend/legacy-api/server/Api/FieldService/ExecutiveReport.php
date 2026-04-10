<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: *');

use EyefiDb\Api\FieldService\ExecutiveReport;
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new ExecutiveReport($db);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    
    if(ISSET($_GET['invoiceReport'])){
        $results = $data->ReadAll($_GET['dateFrom'], $_GET['dateTo']);
    }
    if(ISSET($_GET['getInvoiceView'])){
        $results = $data->invoiceViewDetails($_GET['dateFrom'], $_GET['dateTo']);
    }
    if(ISSET($_GET['getWorkOrderSummary'])){
        $results = $data->getWorkOrderSummary($_GET['dateFrom'], $_GET['dateTo']);
    }
    if(ISSET($_GET['getExpenseSummary'])){
        $results = $data->getExpenseSummary($_GET['dateFrom'], $_GET['dateTo']);
    }
    if(ISSET($_GET['getLaborSummary'])){
        $results = $data->getLaborSummary($_GET['dateFrom'], $_GET['dateTo']);
    }

    echo $db_connect->json_encode($results);
} else {
    http_response_code(500);
    die('Unauthorized');
}
