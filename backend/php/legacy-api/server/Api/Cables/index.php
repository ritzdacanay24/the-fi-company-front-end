<?php

use EyefiDb\Api\Cables\Cables;
use EyefiDb\Databases\DatabaseEyefi;

use EyefiDb\Databases\DatabaseQad as DatabaseQad;

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();
$dbQad->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new Cables($db, $dbQad);
$data->nowDate = date("Y-m-d H:i:s", time());

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    $post = json_decode(file_get_contents('php://input'), true);

    echo $db_connect->json_encode($results);
} else if ($_SERVER['REQUEST_METHOD'] === 'GET') {

    if (isset($_GET['getGraphicsDemandReport'])) {
        $results = $data->getGraphicsDemandReport();
    }

    echo $db_connect->json_encode($results);
} else {
    http_response_code(500);
    die('Unauthorized');
}
