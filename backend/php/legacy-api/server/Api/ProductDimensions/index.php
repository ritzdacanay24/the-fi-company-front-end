<?php

use EyefiDb\Api\ProductDimensions\ProductDimensions;
use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
use EyefiDb\Databases\DatabaseQad as DatabaseQad;
use EyefiDb\Config\Protection as Protection;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$db_connect_Qad = new DatabaseQad();
$dbQad = $db_connect_Qad->getConnection();

$data = new ProductDimensions($db, $dbQad);
$data->nowDate = date("Y-m-d H:i:s", time());

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
	$post = json_decode(file_get_contents('php://input'), true);

	$results = $data->insert($post);
} else if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
	$post = json_decode(file_get_contents('php://input'), true);

	$results = $data->edit($post);
} else if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
	$post = json_decode(file_get_contents('php://input'), true);

	$results = $data->delete($post['delete']);
} else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
	$post = json_decode(file_get_contents('php://input'), true);

	if (isset($_GET['searchById'])) {
		$results = $data->searchById($_GET['searchById']);
	} else if (isset($_GET['getPartNumberInfo'])) {
		$results = $data->getPartNumberInfo($_GET['getPartNumberInfo']);
	} else if (isset($_GET['getAll'])) {
		$results = $data->getReport();
	} else if (isset($_GET['getByPartNumber'])) {
		$results = $data->getByPartNumber($_GET['getByPartNumber']);
	}
}

echo $db_connect->json_encode($results);
