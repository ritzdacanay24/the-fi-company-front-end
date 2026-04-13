<?php

use EyefiDb\Api\Graphics\GraphicsDemands;
use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Databases\DatabaseQad;
use EyefiDb\Config\Protection;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();

$data = new GraphicsDemands($db, $dbQad);
$data->nowDate = date("Y-m-d H:i:s", time());


if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // The request is using the POST method

    $post = json_decode(file_get_contents('php://input'), true);

    if (isset($post['createOrUpdate'])) {
        $results = $data->createOrUpdate($post);
    }

    // if (isset($post)) {
    //     $results = $data->insertMisc($post);
    // }

    echo $db_connect->json_encode($results);
} else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // The request is using the GET method

    if (isset($_GET['getGraphicsDemandReport'])) {
        $results = $data->getGraphicsDemandReport();
    }


    echo $db_connect->json_encode($results);
} else {
    http_response_code(500);
    die('Unauthorized');
}
