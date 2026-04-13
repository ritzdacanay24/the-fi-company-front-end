<?php
include_once __DIR__ . '/WipReport.php';

use EyefiDb\Databases\DatabaseQad as DatabaseQad;

$db_connect_qad = new DatabaseQad();
$db = $db_connect_qad->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$data = new WipReport($db);

$dataInfo = $data->getData();

echo $db_connect_qad->json_encode($dataInfo);
