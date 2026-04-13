<?php
include_once __DIR__ . '/InventoryDetailItemUsage.php';

use EyefiDb\Databases\DatabaseQad as DatabaseQad;

$db_connect_qad = new DatabaseQad();
$db = $db_connect_qad->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$data = new InventoryDetailItemUsage($db);
$data->itemSearchQuery = $_GET['itemSearchQuery'];
$dataInfo = $data->getData();

echo $db_connect_qad->json_encode($dataInfo);
