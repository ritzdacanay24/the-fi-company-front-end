<?php

include_once ROOT_PATH . '/library/upload.class.php';

use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
use EyefiDb\Config\Protection as Protection;

$post = json_decode(file_get_contents('php://input'), true);

try {
    $protected = new Protection();
    $protectedResults = $protected->getProtected();
    $userInfo = $protectedResults->data;

    $db_connect = new DatabaseEyefi();
    $db = $db_connect->getConnection();

    $uploader = new Uploader($db);
    $uploader->sessionId  = $userInfo->id;
    $uploadFile = array(
        "field" => 'Capa Request',
        "uniqueId" => $_POST['uniqueData'],
        "location" => DOCUMENT_ROOT . '/attachments/capa/',
        "mainId" => 0,
        "partNumber" => "",
        "fileBrowse" => "file"
    );

    $dataResults = $uploader->uploadFile($uploadFile);
    echo $db_connect->json_encode($dataResults);
}
catch (Exception $e) {
    http_response_code(500);
    echo $e->getMessage();

}