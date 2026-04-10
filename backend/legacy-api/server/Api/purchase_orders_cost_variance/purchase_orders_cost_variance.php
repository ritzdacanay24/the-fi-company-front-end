<?php
require_once ROOT_DIR . 'config/functions.php';
require_once ROOT_DIR . 'config/error_handling.php';
include_once __DIR__ . '/purchase_orders_cost_variance.class.php';

use EyefiDb\Databases\DatabaseQad as DatabaseQad;
use EyefiDb\Config\Protection as Protection;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();
$dbQad->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$data = new PoCostVariance($dbQad);
if (isset($_GET['ReadAll'])) {
    $dataInfo = $data->readAll();
}

echo $db_connect_qad->json_encode($dataInfo);
