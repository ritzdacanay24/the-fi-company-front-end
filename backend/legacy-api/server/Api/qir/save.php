<?php
use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
use EyefiDb\Config\Protection as Protection;
use EyefiDb\Api\qir\Qir;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new Qir($db);
$data->sessionId = $userInfo->id;

$post = json_decode(file_get_contents('php://input'), true);

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    // The request is using the POST method

    $post = json_decode(file_get_contents('php://input'), true);

    $results = $data->update($_GET['id'], $post);

    echo $db_connect->json_encode($results);
}else{
    if($post){

        if (!$post['id']) {
            $dataInfo = $data->SaveNewRequest($post);
            //$data->send_email($dataInfo['qir'], $_POST, false);
        }else if ($post['id']) {
            $dataInfo = $data->EditNewRequest($post);
        }
        
        if ($post['typeOf'] == 'deleteAttachment') {
            $dataInfo = $data->DeleteAttachment($post['id']);
        }
    }else{
        if ($_POST['typeOf'] == 'Add') {
            $dataInfo = $data->SaveNewRequest($_POST);
            //$data->send_email($dataInfo['qir'], $_POST, false);
        }
        if ($_POST['typeOf'] == 'Edit') {
            $dataInfo = $data->EditNewRequest($_POST);
        }
        if ($_POST['typeOf'] == 'deleteAttachment') {
            $dataInfo = $data->DeleteAttachment($_POST['id']);
        }
    }
    echo $db_connect->json_encode($dataInfo);
}




