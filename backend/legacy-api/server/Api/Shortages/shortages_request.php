<?php
include_once __DIR__ . '/shortages_request.class.php';

use EyefiDb\Databases\DatabaseQad as DatabaseQad;
use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
use EyefiDb\Config\Protection as Protection;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();
$dbQad->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$data = new ShortageRequest($db, $dbQad);
$data->sessionId = $userInfo->id;

if (isset($_GET['ReadByItem'])) {
    $results = $data->ReadByItem($_GET['ReadByItem']);
}
if (isset($_GET['GetShortageLog'])) {
    $results = $data->GetShortageLog($_GET['GetShortageLog']);
}
if (isset($_GET['jobNumber'])) {
    $results = $data->searchById($_GET['jobNumber']);
}


echo $db_connect->json_encode($results);
