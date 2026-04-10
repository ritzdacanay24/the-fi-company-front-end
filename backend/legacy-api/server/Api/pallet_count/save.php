<?php

use EyefiDb\Databases\DatabaseQad;
use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Api\pallet_count\PalletCount;
use EyefiDb\Config\Protection as Protection;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();
$dbQad->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);


$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new PalletCount($dbQad, $db);
$data->user_full_name = $userInfo->full_name;
$post = json_decode(file_get_contents('php://input'), true);


if (isset($_POST['edit'])) {
    $dataInfo = $data->update($_POST['details']);
}
if (isset($post['editPalletInfo'])) {
    $dataInfo = $data->update($post['details']);
}

if (isset($_POST['saveWeeklyUsers'])) {
    $dataInfo = $data->saveWeeklyUsers($_POST['details']);
}

if (isset($_POST['cycleCountPallets'])) {
    $dataInfo = $data->cycleCountPallets($_POST['details'], $_POST['fieldName']);
}

if (isset($post['performCycleCount'])) {
    $dataInfo = $data->cycleCountPallets($post['details'], $post['fieldName']);
}

echo $db_connect_qad->json_encode($dataInfo);
