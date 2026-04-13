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


if (isset($post['delete'])) {
    $uploader->fileLocation = $post['fileLocation'];
    $uploader->id = $post['id'];
    $uploader->field = $post['field'];
    $dataResults = $uploader->deleteFile();
}else{
    $uploadFile = array(
        "field" => $_POST['field'],
        "uniqueId" => $_POST['uniqueData'],
        "location" => DOCUMENT_ROOT . '/attachments/' . $_POST['folderName'] . '/',
        "mainId" => isset($_POST['mainId']) ? $_POST['mainId'] : null,
        "partNumber" => "",
        "fileBrowse" => "file",
        "title" => isset($_POST['title']) ? $_POST['title'] : null,
    );
    $dataResults = $uploader->uploadFile($uploadFile);
}


echo $db_connect->json_encode($dataResults);
