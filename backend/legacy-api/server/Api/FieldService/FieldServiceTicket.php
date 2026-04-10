<?php

use EyefiDb\Api\FieldService\FieldServiceTicket;
use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Config\Protection;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new FieldServiceTicket($db);
$data->nowDate = date("Y-m-d H:i:s", time());
$data->sessionId = $userInfo->id;
$data->full_name = $userInfo->full_name;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // The request is using the POST method
    $post = json_decode(file_get_contents('php://input'), true);

    if (isset($post['name'])) {
        if ($post['name'] == 'orderInfo') {
            $results = $data->updateWorkOrder($post);
        } else if ($post['name'] == 'addWorkDetail') {
            $results = $data->createLabor($post['workOrderId'], $post['seq']);
        } else if ($post['name'] == 'createLaborAll') {
            $results = $data->createLaborAll($post);
        } else if ($post['name'] == 'DeleteWorkDetails') {
            $results = $data->deleteLabor($post['id']);
        } else if ($post['name'] == 'workOrderDetail') {
            $results = $data->updateLabor($post);
        } else if ($post['name'] == 'UpdateMiscDetail') {
            $results = $data->updateMisc($post);
        } else if ($post['name'] == 'AddMiscDetail') {
            $results = $data->createMisc($post['workOrderId']);
        } else if ($post['name'] == 'DeleteMiscDetail') {
            $results = $data->deleteMisc($post['id']);
        } else if ($post['name'] == 'SurveyComplete') {
            $results = $data->createSurvey($post['details'], $post['data'], $post);
        } else {
            throw new PDOException("Post name not found.");
        }
    }

    if (isset($post['sendTechSchedule'])) {
        $results = $data->sendTechSchedule($post);
    }

    if (isset($post['createTicket'])) {
        $results = $data->createWorkOrder($post['fs_scheduler_id']);
    }

    if (isset($post['startOver'])) {
        $results = $data->deleteWorkOrder($post['startOver']);
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
