<?php

use EyefiDb\Api\Graphics\Graphics;
use EyefiDb\Api\Graphics\GraphicsHold;
use EyefiDb\Api\Graphics\GraphicsDamagedRejected;
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


$data = new Graphics($db, $dbQad);
$data->nowDate = date("Y-m-d H:i:s", time());
$data->sessionId = $userInfo->id;


$holdsData = new GraphicsHold($db);

$damageRejectInstance = new GraphicsDamagedRejected($db);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // The request is using the POST method

    $post = json_decode(file_get_contents('php://input'), true);

    if (isset($post['createWorkOrder'])) {
        $results = $data->createWorkOrder($post);
    }

    if (isset($post['moveOrder'])) {
        $results = $data->moveOrder($post);

        if ($post['issueCount']) {
            $results = $damageRejectInstance->clearDamgedReject($post);
        }
    }

    if (isset($post['createHold'])) {
        $results = $holdsData->createHold($post);
    }

    if (isset($post['removeHold'])) {
        $results = $holdsData->removeHold($post);
    }

    if (isset($post['createDamageReject'])) {
        $results = $damageRejectInstance->createDamageReject($post);
    }

    if (isset($post['completeOrder'])) {
        $results = $data->completeOrder($post);
    }


    echo json_encode($results);
} else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // The request is using the GET method

    if (isset($_GET['getGraphicProductionOrders'])) {
        $results = $data->getGraphicProductionOrders();
    }

    if (isset($_GET['getHoldsByOrderNumber'])) {
        $results = $holdsData->getHoldsByOrderNumber($_GET['orderNumber']);
    }

    echo $db_connect->json_encode($results);
} else {
    http_response_code(500);
    die('Unauthorized');
}
