<?php
include_once __DIR__ . '/revenue.class.php';

use EyefiDb\Databases\DatabaseQad as DatabaseQad;

$db_connect_qad = new DatabaseQad();
$db = $db_connect_qad->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$isValid = isset($_GET['dateFrom']) && isset($_GET['dateTo']);
if ($isValid) {

    $data = new RevenueReport($db);
    $dateFrom = $_GET['dateFrom'];
    $dateTo = $_GET['dateTo'];
    $dataInfo = $data->getRevenueDetails($dateFrom, $dateTo);

    echo $db_connect_qad->json_encode($dataInfo);
} else {
    echo json_encode([
        "message" => "Invalid Parameters"
    ]);
    ___http_response_code(500);
}
