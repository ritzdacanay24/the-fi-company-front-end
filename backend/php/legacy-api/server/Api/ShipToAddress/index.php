<?php
use EyefiDb\Databases\DatabaseQad;
use EyefiDb\Api\ShipToAddress\ShipToAddress;

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();
$dbQad->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$data = new ShipToAddress($dbQad);

if (isset($_GET['read'])) {
    $dataInfo = $data->read($_GET['read']);
}

echo $db_connect_qad->json_encode($dataInfo);
