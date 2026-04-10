<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: *');

use EyefiDb\Api\FieldService_\FieldService_;
use EyefiDb\Api\FieldService_\ServiceJobs;
use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Config\Protection;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new FieldService_($db);
$data->nowDate = date("Y-m-d H:i:s", time());
$data->sessionId = $userInfo->id;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // The request is using the POST method

    $post = json_decode(file_get_contents('php://input'), true);

    if (isset($post['createWorkOrder'])) {
        $results = $data->createWorkOrder($post);
    }

    if (isset($post['updateWorkOrder'])) {
        $results = $data->updateWorkOrder($post);
    }

    if (isset($post['updateReqeustDate'])) {
        $results = $data->updateWorkOrderRequestDateAndTime($post);
    }

    if (isset($post['insertGeneral'])) {
        $results = $data->createEvents($post);
    }

    if (isset($post['updateGeneral'])) {
        $results = $data->updateEvent($post);
    }

    if (isset($post['updateGeneralDate'])) {
        $results = $data->updateEventStartAndEndDate($post);
    }

    if (isset($post['deleteEvent'])) {
        $results = $data->deleteEvent($post);
    }
    if (isset($post['updateSchedulerProperty'])) {
        $results = $data->updateSchedulerProperty($post);
    }
    
    
    
    if (isset($post['editPropertyById'])) {
        $results = $data->editPropertyById($post);
    }
    if (isset($post['addProperty'])) {
        $results = $data->addProperty($post);
    }
    if (isset($_POST['typeOfTransaction']) && $_POST['typeOfTransaction'] == 'createExpense') {
        $results = $data->createExpense($_POST);
    }
    if (isset($_POST['typeOfTransaction']) && $_POST['typeOfTransaction'] == 'updateExpense') {
        $results = $data->updateExpense($_POST);
    }
    if (isset($post['removeExpense'])) {
        $results = $data->removeExpense($post);
    }
    
    
    

    echo json_encode($results);
} else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // The request is using the GET method
    
    
    if (isset($_GET['get_group_jobs'])) {
        $results = $data->get_group_jobs($_GET['get_group_jobs']);
    }
    
    if (isset($_GET['jobAssigments'])) {
        $results = $data->jobAssigments($_GET['tech_name'], $_GET['status']);
    }
    if (isset($_GET['getClients'])) {
        $results = $data->getClients();
    }
    if (isset($_GET['getProperties'])) {
        $results = $data->getProperties($_GET['getProperties']);
    }
    if (isset($_GET['getClientReport'])) {
        $results = $data->getClientReport();
    }
    if (isset($_GET['getJobDetails'])) {
        $results = $data->getTicketJobDetailsByUnqiueId($_GET['getJobDetails']);
    }
    if (isset($_GET['getAllProperty'])) {
        $results = $data->getAllProperty();
    }

    if (isset($_GET['getPropertyById'])) {
        $results = $data->getPropertyById($_GET['getPropertyById']);
    }

    if (isset($_GET['overview'])) {
        $results = $data->overview();
    }

    if (isset($_GET['generate_job_hour_break_down_explode_grouped'])) {
        $results = $data->generate_job_hour_break_down_explode_grouped($_GET['generate_job_hour_break_down_explode_grouped']);
    }
    

    if (isset($_GET['getServiceJobs'])) {
        $serviceJobInstance = new ServiceJobs($db);
        $results = $serviceJobInstance->generateReport($_GET['dateFrom'], $_GET['dateTo']);
    }

    if (isset($_GET['getCalendarData'])) {
        $results = $data->getCalendarData($_GET['dateFrom'], $_GET['dateTo']);
    }

    if (isset($_GET['byFsId'])) {
        $results = $data->getData(null, null, $_GET['byFsId']);
    }

    if (isset($_GET['viewById'])) {
        $results = $data->viewById($_GET['viewById']);
    }

    if (isset($_GET['getGeneralById'])) {
        $results = $data->getGeneralById($_GET['getGeneralById']);
    }

    if (isset($_GET['getTicketAssignmentsByTechs'])) {
        $results = $data->getTicketAssignmentsByTechs($_GET['techName'], $_GET['ticketStatus']);
    }
    if (isset($_GET['getFullEvents'])) {
        $results = $data->getFullEvents($_GET['techName'], $_GET['ticketStatus']);
    }
    
    if (isset($_GET['mergeColors'])) {
        $results = $data->mergeColors();
    }

    if (isset($_GET['getTicketById'])) {
        $results = $data->generateTicketInfoById($_GET['getTicketById']);
    }

    if (isset($_GET['byDate'])) {
        $results = $data->getData($_GET['dateFrom'], $_GET['dateTo'], null);
    }

    if (isset($_GET['availableTechs'])) {
        $results = $data->availableTechs($_GET['dateFrom'], $_GET['dateTo']);
    }


    echo $db_connect->json_encode($results);
} else {
    http_response_code(500);
    die('Unauthorized');
}
