<?php

use EyefiDb\Api\InventoryValuation\InventoryValuation;
use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Databases\Database;

use EyefiDb\Databases\DatabaseQad as DatabaseQad;

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();
$dbQad->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new InventoryValuation($db, $dbQad);
$data->nowDate = date("Y-m-d H:i:s", time());

$results = $data->test();

echo $db_connect->json_encode($results);
