<?php
include_once __DIR__ . '/InventoryMap.php';

use EyefiDb\Databases\DatabaseQad as DatabaseQad;

$db_connect_qad = new DatabaseQad();

$db = $db_connect_qad->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$data = new InventoryMap($db);

if (isset($_GET['location'])) {

    $data->locationFrom = $_GET['from'];
    $data->locationTo = $_GET['to'];

    $dataInfo = $data->locations();
    echo $db_connect_qad->json_encode($dataInfo);
}else if (isset($_GET['from'])) {
    $data->locationFrom = $_GET['from'];
    $data->locationTo = $_GET['to'];
    $data->in = $_GET['from'];
    $data->bldg = '300 BLDG';

    $dataInfo = $data->readDetails();
    echo $db_connect_qad->json_encode($dataInfo);
}else if (isset($_GET['readMain'])) {

    $dataInfo = $data->readMain();
    echo $db_connect_qad->json_encode($dataInfo);
}


