<?php
include_once __DIR__ . '/inventory_by_prod_line.class.php';

use EyefiDb\Databases\DatabaseQad as DatabaseQad;

$db_connect_qad = new DatabaseQad();

$db = $db_connect_qad->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$data = new InventoryByProdLine($db);
$dataInfo = $data->getSafetyStock();
echo $db_connect_qad->json_encode($dataInfo);
