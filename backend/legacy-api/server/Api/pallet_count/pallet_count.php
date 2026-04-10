<?php

use EyefiDb\Databases\DatabaseQad;
use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Api\pallet_count\PalletCount;
use EyefiDb\Api\pallet_count\PalletCountMasterSceduling;

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();
$dbQad->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);


$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();


if (isset($_GET['cycleTimes'])) {
    $data = new PalletCount($dbQad, $db);
    $dataInfo = $data->palletCount();
}
if (isset($_GET['cycleTimesEdit'])) {
    $data = new PalletCount($dbQad, $db);
    $dataInfo = $data->cycleTimesEdit();
}
if (isset($_GET['palletCycleCount'])) {
    $data = new PalletCount($dbQad, $db);
    $dataInfo = $data->palletCycleCount();
}

if (isset($_GET['PalletCountMasterScheduling'])) {
    $data1 = new PalletCountMasterSceduling($dbQad, $db);
    $dataInfo = $data1->palletCount();
}

if (isset($_GET['PalletCountMasterSchedulingCycleTimesEdit'])) {
    $data1 = new PalletCountMasterSceduling($dbQad, $db);
    $dataInfo = $data1->cycleTimesEdit();
}

if (isset($_GET['Shipping'])) {
    $data = new PalletCount($dbQad, $db);
    $dataInfo = $data->palletCycleCount();
}

if (isset($_GET['Production'])) {
    $data1 = new PalletCountMasterSceduling($dbQad, $db);
    $dataInfo = $data1->cycleTimesEdit();
}
echo $db_connect_qad->json_encode($dataInfo);
