<?php
require_once ROOT_DIR . 'config/functions.php';
require_once ROOT_DIR . 'config/error_handling.php';
include_once __DIR__ . '/fg_rct_wo.class.php';

use EyefiDb\Databases\DatabaseQad as DatabaseQad;
use EyefiDb\Config\Protection as Protection;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();
$dbQad->setAttribute( PDO::ATTR_CASE, PDO::CASE_NATURAL );  

$isValid = ISSET($_GET['ReadAll']);
if(!$isValid){
    echo json_encode([
        "message" => "Invalid Parameters"
    ]);
    ___http_response_code(500);
        
}

$data = new FinishedGoodsRctWo($dbQad);
$data->nowDate = date(" Y-m-d H:i:s", time());
$dateFrom = $_GET['dateFrom'];
$dateTo = $_GET['dateTo'];

$dataInfo = $data->ReadAll($dateFrom, $dateTo);
echo $db_connect_qad->json_encode($dataInfo);
