<?php

use EyefiDb\Api\FieldService_\FieldServiceTicket_;
use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Config\Protection;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new FieldServiceTicket_($db);
$data->nowDate = date("Y-m-d H:i:s", time());
$data->sessionId = $userInfo->id;
$data->full_name = $userInfo->full_name;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // The request is using the POST method

    $post = json_decode(file_get_contents('php://input'), true);

    if (isset($post['name'])) {
        if ($post['name'] == 'orderInfo') {
            $results = $data->UpdateOrderInfo($post);
        } else if ($post['name'] == 'addWorkDetail') {
            $results = $data->AddWorkDetails($post);
        } else if ($post['name'] == 'DeleteWorkDetails') {
            $results = $data->DeleteWorkDetails($post['id'], $post['modifyingType'], $post['workOrderId']);
        } else if ($post['name'] == 'workOrderDetail') {
            $results = $data->WorkOrderDetail($post, $post['modifyingType']);
        } else if ($post['name'] == 'UpdateMiscDetail') {
            $results = $data->UpdateMiscDetail($post, $post['modifyingType']);
        } else if ($post['name'] == 'AddMiscDetail') {
            $results = $data->AddMiscDetail($post['workOrderId']);
        } else if ($post['name'] == 'DeleteMiscDetail') {
            $results = $data->DeleteMiscDetail($post['id'], $post['modifyingType']);
        } else if ($post['name'] == 'SurveyComplete') {
            $results = $data->SurveyComplete($post['details'], $post['data'], $post);
        } else if ($post['name'] == 'UpdateTripExpense') {
            $results = $data->UpdateTripExpense($post['obj']);
        } else {
            throw new PDOException("Post name not found.");
        }
    }

    if (isset($post['sendTechSchedule'])) {
        $results = $data->sendTechSchedule($post);
    }

    if (isset($post['createTicket'])) {
        $results = $data->createTicket($post['fs_scheduler_id']);
    }

    if (isset($post['startOver'])) {
        $results = $data->StartOver($post['startOver']);
    }

    echo json_encode($results);
} else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // The request is using the GET method
    if (isset($_GET['sendEmail'])) {
        $results = $data->sendEmail();
    }
    echo json_encode($results);
} else {
    http_response_code(500);
    die('Unauthorized');
}
