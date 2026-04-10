<?php

use EyefiDb\Api\SupplyReviewCodes\SupplyReviewCodes;
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new SupplyReviewCodes($db);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    $post = json_decode(file_get_contents('php://input'), true);

    $results = $data->remove($post);

    echo json_encode($results);
} else {
    http_response_code(500);
    die('Unauthorized');
}
