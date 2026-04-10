<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$mainQry = "
    select *
    from kanban a 
";

$query = $db->prepare($mainQry);
$query->execute();
$queues =  $query->fetchAll(PDO::FETCH_ASSOC);

$mainQry = "
    select *
    from kanban_details a 
";

$query = $db->prepare($mainQry);
$query->execute();
$resultDetails =  $query->fetchAll(PDO::FETCH_ASSOC);

$totalOrders = count($resultDetails);

foreach ($queues as &$queue_row) {
    $queue_status = $queue_row['id'];
    $queue_row['details'] = array();
    foreach ($resultDetails as $resultDetails_row) {
        $status = $resultDetails_row['kanban_ID'];

        if ($queue_status == $status) {
            $queue_row['details'][] = $resultDetails_row;
        }
    }
}

$data = array(
    "totalOrders" => $totalOrders,
    "queues" => $queues,
);


echo $db_connect->json_encode($data);

