<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: *');

use EyefiDb\Api\FieldService\FieldService;
use EyefiDb\Api\FieldService\ServiceJobs;
use EyefiDb\Api\FieldService\TripExpense;
use EyefiDb\Api\FieldService\FieldServiceOverall;
use EyefiDb\Api\FieldService\FieldServicePerformance;

use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Config\Protection;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new FieldService($db);
$data->nowDate = date("Y-m-d H:i:s", time());
$data->sessionId = $userInfo->id;



$tripExpenseInstance = new TripExpense($db);

$tripExpenseInstance->nowDate = date("Y-m-d H:i:s", time());
$tripExpenseInstance->sessionId = $userInfo->id;

$FieldServiceOverallInstance = new FieldServiceOverall($db);
$FieldServicePerformanceInstance = new FieldServicePerformance($db);

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') { 
    // do something
    
    
    if (isset($_GET['deleteAttachment'])) {
        $results = $data->deleteAttachment($_GET['deleteAttachment']);
    }


    if (isset($_GET['assetRemove'])) {
        $results = $data->removeAsset($_GET['assetRemove']);
    }
    if (isset($_GET['deleteQir'])) {
        $results = $data->deleteQir($_GET['deleteQir']);
    }

}else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
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

    // if (isset($_GET['addClient'])) {
    //     $results = $data->addClient($post);
    // }

    if (isset($post['createGroup'])) {
        $results = $data->createGroup($post['jobs'], ISSET($post['groupId']) ? $post['groupId']: $post['groupId']);
    }
    if (isset($post['removeFromGroup'])) {
        $results = $data->removeFromGroup($post['removeFromGroup']);
    }
    if (isset($post['addToExistingGroup'])) {
        $results = $data->addToExistingGroup($post);
    }
    if (isset($post['createNewGroup'])) {
        $results = $data->createNewGroup($post['fsId']);
    }
    
    //General trip expense CRUD file
    if(isset($post['file']) && $post['file'] == 'tripExpense'){
        if (isset($post['typeOfTransaction']) && $post['typeOfTransaction'] == 'createExpense') {

            $results = $tripExpenseInstance->createExpense($post);
        }else if (isset($post['typeOfTransaction']) && $post['typeOfTransaction'] == 'updateExpense') {
            $results = $tripExpenseInstance->updateExpense($post);
        }  else if (isset($post['typeOfTransaction']) && $post['typeOfTransaction'] == 'removeExpense') {
            $results = $tripExpenseInstance->removeExpense($post);
        }  
        
    }else if(isset($_POST['file']) && $_POST['file'] == 'tripExpense'){
        if (isset($_POST['typeOfTransaction']) && $_POST['typeOfTransaction'] == 'createExpense') {

            $results = $tripExpenseInstance->createExpense($_POST);
        }else if (isset($_POST['typeOfTransaction']) && $_POST['typeOfTransaction'] == 'updateExpense') {
            $results = $tripExpenseInstance->updateExpense($_POST);
        }  else if (isset($_POST['typeOfTransaction']) && $_POST['typeOfTransaction'] == 'removeExpense') {
            $results = $tripExpenseInstance->removeExpense($_POST);
        }  
        
    }
    
    if (isset($post['asset'])) {
        
        if (!isset($post['id'])) {
            $results = $data->createAsset($post);
        }else{
            $results = $data->updateAsset($post);
        }
    }
    
    if (isset($_GET['fsConfirmCreate'])) {
        $results = $data->fsConfirmCreate($post);
    }

    
    echo json_encode($results);
} else if ($_SERVER['REQUEST_METHOD'] === 'PUT') {

    
    $post = json_decode(file_get_contents('php://input'), true);

    if (isset($post['typeOf']) && $post['typeOf'] == 'qir') {
        
        if (isset($post['id'])) {
            $results = $data->updateQir($post);
        }
    }


    echo json_encode($results);

} else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // The request is using the GET method
    
    
    
    if (isset($_GET['fs_full_events'])) {
        $results = $data->fs_full_events($_GET['fs_full_events'], ISSET($_GET['status']) ? $_GET['status']:'Open');
    }
    if (isset($_GET['requests'])) {
        $results = $data->requests($_GET['requests']);
    }
    
    if (isset($_GET['getAttachmentByFsId'])) {
        $results = $data->getAttachmentByFsId($_GET['getAttachmentByFsId']);
    }
    if (isset($_GET['getServiceCall'])) {
        $results = $data->getServiceCall();
    }
    
    if (isset($_GET['fsConfirmGetById'])) {
        $results = $data->fsConfirmGetById($_GET['fsConfirmGetById']);
    }
    if (isset($_GET['fsConfirmGetByFsId'])) {
        $results = $data->fsConfirmGetByFsId($_GET['fsConfirmGetByFsId']);
    }
    if (isset($_GET['getTicketJobDetailsById'])) {
        $results = $data->getTicketJobDetailsById($_GET['getTicketJobDetailsById']);
    }
    if (isset($_GET['getTicketInfoById'])) {
        $results = $data->getTicketInfoById($_GET['getTicketInfoById']);
    }
    if (isset($_GET['getTicketTripExpenseById'])) {
        $results = $data->getTicketTripExpenseById($_GET['getTicketTripExpenseById']);
    }
    if (isset($_GET['getImagesById'])) {
        $results = $data->getImagesById($_GET['getImagesById']);
    }

    if (isset($_GET['getQirById'])) {
        $results = $data->getQirById($_GET['getQirById']);
    }

    if (isset($_GET['getQirByFsId'])) {
        $results = $data->getQirByFsId($_GET['getQirByFsId']);
    }

    if (isset($_GET['getFormValues'])) {
        $results = $data->getFormValues(false);
    }

    if (isset($_GET['assetId'])) {
        $results = $data->getAssetById($_GET['assetId']);
    }

    if (isset($_GET['getInvoice'])) {
        $results = $data->getInvoice();
    }

    
    if (isset($_GET['getGroupedJobs'])) {

        $results = array(
            "getGroupedJobs" => $data->byDate(null, null, 'Group', $_GET['getGroupedJobs']),
            "openJobs" => $data->byDate(null, null, ISSET($_GET['view']) ? $_GET['view'] : 'Open')
        );
    }
    
    if (isset($_GET['readTransactions'])) {
        $results = $data->readTransactions($_GET['readTransactions']);
    }

    if (isset($_GET['getTurnoverRate'])) {
        $results = $data->getTurnoverRate($_GET['dateFrom'], $_GET['dateTo']);
    }
    
    if (isset($_GET['customerSatisfactionReport'])) {
        $results = $data->readCustomerSatisfacationData($_GET['dateFrom'], $_GET['dateTo']);
    }

    if (isset($_GET['platformAvg'])) {
        $results = $data->readPlatformData($_GET['dateFrom'], $_GET['dateTo']);
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

    


    if (isset($_GET['getServiceJobs'])) {
        $serviceJobInstance = new ServiceJobs($db);
        $results = $serviceJobInstance->generateReport($_GET['dateFrom'], $_GET['dateTo']);
    }

    if (isset($_GET['getCalendarData'])) {
        $results = $data->getCalendarData($_GET['dateFrom'], $_GET['dateTo']);
    }

    if (isset($_GET['byFsId'])) {
        $results = $data->byFsId($_GET['byFsId']);
    }

    if (isset($_GET['viewById'])) {
        $results = $data->viewById($_GET['viewById']);
    }
    if (isset($_GET['getOpenJobs'])) {
        $results = $data->getOpenJobs();
    }
    if (isset($_GET['getPendingInvoice'])) {
        $results = $data->getPendingInvoice();
    }

    if (isset($_GET['getGeneralById'])) {
        $results = $data->getGeneralById($_GET['getGeneralById']);
    }

    if (isset($_GET['getTicketAssignmentsByTechs'])) {
        $results = $data->getTicketAssignmentsByTechs($_GET['techName'], $_GET['ticketStatus']);
    }

    if (isset($_GET['mergeColors'])) {
        $results = $data->mergeColors();
    }

    if (isset($_GET['generateTicketInfoById1'])) {
        $results = $data->generateTicketInfoById1($_GET['generateTicketInfoById1']);
    }

    if (isset($_GET['getTicketById'])) {
        $results = $data->generateTicketInfoById($_GET['getTicketById']);
    }

    if (isset($_GET['byDate'])) {
        $results = $data->byDate($_GET['dateFrom'], $_GET['dateTo'], ISSET($_GET['view']) ? $_GET['view'] : 'byDate', ISSET($_GET['groupId']) ? $_GET['groupId'] : null);
    }
    
    if (isset($_GET['byDateAndEvents'])) {
        $results = $data->byDateAndEvents($_GET['dateFrom'], $_GET['dateTo']);
    }
    if (isset($_GET['getSchedule'])) {
        $results = $data->getSchedule();
    }
    if (isset($_GET['getCount'])) {
        $results = $data->getCount();
    }
    if (isset($_GET['confirmedJobs'])) {
        $results = $data->confirmedJobs();
    }
    if (isset($_GET['ticketInProcess'])) {
        $results = $data->ticketInProcess();
    }
    
    
    if (isset($_GET['availableTechs'])) {
        $results = $data->availableTechs($_GET['dateFrom'], $_GET['dateTo']);
    }

    if (isset($_GET['ViewDateByWeek'])) {
        $results = $data->ReadByWeek($_GET['dateFromWeek'], $_GET['dateToWeek']);
    }

        
    if (isset($_GET['getSurvey'])) {
        $results = $data->getSurvey($_GET['getSurvey']);
    }

    if (isset($_GET['getSurvey'])) {
        $results = $data->getSurvey($_GET['getSurvey']);
    }
    
    if (isset($_GET['getFullEvents'])) {
        $results = $data->getFullEvents($_GET['techName'], $_GET['ticketStatus']);
    }
    
    if (isset($_GET['getJobDetails'])) {
        $results = $data->getTicketJobDetailsByUnqiueId($_GET['getJobDetails']);
    }
    

    if(ISSET($_GET['serviceJobDateFrom'])){        

        

    $FieldServiceOverallInstance->dateFrom = $_GET['dateFrom'];
    $FieldServiceOverallInstance->dateTo = $_GET['dateTo'];

    $FieldServiceOverallInstance->serviceJobDateFrom = $_GET['serviceJobDateFrom'];
    $FieldServiceOverallInstance->serviceJobDateTo = $_GET['serviceJobDateTo'];

    $FieldServiceOverallInstance->statusSelection = $_GET['statusSelection'];
    $FieldServiceOverallInstance->serviceSelection = $_GET['serviceSelection'];

        if(ISSET($_GET['surveyDetails'])){
            $results = $FieldServiceOverallInstance->getSurveyDetails($_GET['surveyDetails']);
            
        }else{
        
            $results = array(
                "monthlyInvoice" => $FieldServiceOverallInstance->getChart()
                // , "current"  => $FieldServiceOverallInstance->getCurrent() 
                // , "currentWeek" => $FieldServiceOverallInstance->getCurrentWeek()
                // , "curentWeekStatus" => $FieldServiceOverallInstance->getStatus()
                // , "weeklyScoreCard" => $FieldServiceOverallInstance->getWeeklyScoreCard()
                // , "getServiceTypes" => $FieldServiceOverallInstance->getServiceTypes() 
                // , "getByState" => $FieldServiceOverallInstance->getByState()  
                // , "getByStateDetails" => $FieldServiceOverallInstance->getByStateDetails()
                // , "getAllScoreCards" => $FieldServiceOverallInstance->getAllScoreCards()
                // , "testDate" => $FieldServiceOverallInstance->testDate() 
                // , "getTotalSubPercentage" => $FieldServiceOverallInstance->getTotalSubPercentage()
                // , "getSurveys" => $FieldServiceOverallInstance->getSurveys() 
                // , "getMonthlyReview" => $FieldServiceOverallInstance->getMonthlyReview()
                , "getStatusSelections" => $FieldServiceOverallInstance->getStatusSelections()
                , "getServiceSelections" => $FieldServiceOverallInstance->getServiceSelections()
            );
        }
        }

    if(ISSET($_GET['performance'])){
        $results = $FieldServicePerformanceInstance->ReadAll($_GET['dateFrom'], $_GET['dateTo']);
    }

    echo $db_connect->json_encode($results);
} else {
    http_response_code(500);
    die('Unauthorized');
}
