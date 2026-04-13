<?php

use EyefiDb\Api\Upload\Upload;

use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
use EyefiDb\Config\Protection as protection;

$protected = new protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$uploader = new Upload($db);
$uploader->sessionId  = $userInfo->id;

$post = json_decode(file_get_contents('php://input'), true);

$uploadFile = array(
    "field" => 'LOGISTICS_CALENDAR',
    "uniqueId" => $_GET['id'],
    "location" => DOCUMENT_ROOT . '/attachments/receiving/',
    "mainId" => isset($_POST['mainId']) ? $_POST['mainId'] : null,
    "partNumber" => "",
    "fileBrowse" => "file"
);
$dataResults = $uploader->uploadFile($uploadFile);


if (isset($post['delete'])) {
    $uploader->fileLocation = $post['fileLocation'];
    $uploader->id = $post['id'];
    $uploader->field = $post['field'];
    $dataResults = $uploader->deleteFile();
}


echo $db_connect->json_encode($dataResults);
