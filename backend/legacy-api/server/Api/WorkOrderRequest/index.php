<?php

require_once('/var/www/html/shared/util.php');

use EyefiDb\Api\WorkOrderRequest\WorkOrderRequest;
use EyefiDb\Databases\DatabaseEyefi;


$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_ORACLE_NULLS, PDO::NULL_EMPTY_STRING);

$data = new WorkOrderRequest($db);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    $post = json_decode(file_get_contents('php://input'), true);
    
    $qry = dynamicInsert('work_order_request', $post);

    
		$query = $db->prepare($qry);
		$query->execute();

    echo json_encode("Created");
} else if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    
    $post = json_decode(file_get_contents('php://input'), true);
    
    $qry = dynamicUpdate('work_order_request', $post, $_GET['id']);
    $query = $db->prepare($qry);
    $query->execute();

    echo json_encode("Updated");

} else if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
} else if ($_SERVER['REQUEST_METHOD'] === 'GET') {

    $results = $data->getAll();

    echo json_encode($results);
}else{
    http_response_code(500);
    die('Unauthorized');
}