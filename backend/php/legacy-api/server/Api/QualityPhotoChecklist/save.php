<?php
include_once __DIR__ . '/QualityPhotoChecklist.php';

use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
use EyefiDb\Databases\DatabaseQad as DatabaseQad;

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();
$dbQad->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new QualityPhotoChecklist($db, $dbQad);

$dataInfo = array();

$uploadFile = array(
    "location" => DOCUMENT_ROOT . '/attachments/qc/',
    "subLocation" => '/attachments/qc/',
    "fileBrowse" => "file"
);
try {
    $dataResults = $data->uploadPhoto($uploadFile);

    if($dataResults['status'] == 'success'){
        $_POST['fileName'] = $dataResults['fileName'];
        $dataInfo = $data->save($_POST);
        $_POST['fileName'] = $dataResults['fileName'];
        $_POST['id'] = $dataInfo;
    }else{
        unlink($dataResults['fileName']);
    }

    echo json_encode($_POST);
}

catch(Exception $e) {
    echo 'Message: ' .$e->getMessage();
    unlink($dataResults['fileName']);
}


