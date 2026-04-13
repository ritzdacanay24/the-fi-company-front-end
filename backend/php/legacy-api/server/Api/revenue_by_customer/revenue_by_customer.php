<?php
require_once ROOT_DIR . 'config/functions.php';
require_once ROOT_DIR . 'config/error_handling.php';
include_once __DIR__ . '/revenue_by_customer.class.php';

use EyefiDb\Databases\DatabaseQad as DatabaseQad;
use EyefiDb\Config\Protection as Protection;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect_qad = new DatabaseQad();

$db = $db_connect_qad->getConnection();
$db->setAttribute( PDO::ATTR_CASE, PDO::CASE_NATURAL );  

$isValid = ISSET($_GET['dateFrom']) && ISSET($_GET['dateTo']);
if($isValid){

	$dateFrom = $_GET['dateFrom'];
	$dateTo = $_GET['dateTo'];
	$data = new RevenueByCustomer($db);
	$dataInfo = $data->getRevenyByCustomer($dateFrom, $dateTo);

	echo $db_connect_qad->json_encode($dataInfo);
		
} else {
	echo json_encode([
		"message" => "Invalid Parameters"
	]);
	___http_response_code(500);
}


