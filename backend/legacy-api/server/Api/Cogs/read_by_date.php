<?php
use EyefiDb\Api\Cogs\Cogs;

use EyefiDb\Databases\DatabaseQad as DatabaseQad;

$db_connect_qad = new DatabaseQad();
$db = $db_connect_qad->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$isValid = isset($_GET['dateFrom']) && isset($_GET['dateTo']);
if ($isValid) {

    $data = new Cogs($db);
    $dateFrom = $_GET['dateFrom'];
    $dateTo = $_GET['dateTo'];
    $dataInfo = $data->read_by_date($dateFrom, $dateTo);

    echo $db_connect_qad->json_encode($dataInfo);
} else {
    echo json_encode([
        "message" => "Invalid Parameters"
    ]);
    http_response_code(500);
}
