<?php
use EyefiDb\Databases\DatabaseQad;
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseQad();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_LOWER);

$db_connect_fi = new DatabaseEyefi();
$dbFi = $db_connect_fi->getConnection();
$dbFi->setAttribute(PDO::ATTR_CASE, PDO::CASE_LOWER);

$queue = $_GET['queue'];
$t = $_GET['wo_nbr'];
$routingOps = $_GET['route'];

$mainQry = "
    select * 
    from kanban 
    where id = :id
";

$query = $dbFi->prepare($mainQry);
$query->bindParam(':id', $queue, PDO::PARAM_STR);
$query->execute();
$checkValidation =  $query->fetch(PDO::FETCH_ASSOC);


$mainQry = "
    select wod_nbr
        , sum(a.wod_qty_req - a.wod_qty_iss) qty_open
    from wod_det a
    where wod_nbr = ? and wod_domain = 'EYE'
    group by wod_nbr
";

$params = array("$t");

$query = $db->prepare($mainQry);
$query->execute($params);
$pickInfo =  $query->fetch(PDO::FETCH_ASSOC);

$mainQry = "
    select cast(a.wr_qty_ord as numeric(36,0)) wr_qty_ord
        , cast((a.wr_qty_ord - a.wr_qty_comp) as numeric(36,0))  open_qty
        , a.wr_nbr
        , wr_op
    from wr_route a 
    where wr_domain = 'EYE' 
    and wr_op = '$routingOps'
    and wr_nbr = ?
";
$params = array("$t");

$query = $db->prepare($mainQry);
$query->execute($params);
$routingInfo =  $query->fetch(PDO::FETCH_ASSOC);

$mainQry = "
    select wod_nbr
        , (a.wod_qty_req - a.wod_qty_iss) open_qty
        , cast(a.wod_qty_req as numeric(36,0)) wod_qty_req
        , cast(a.wod_qty_iss as numeric(36,0)) wod_qty_iss
    from wod_det a
    where wod_nbr = ? 
    and wod_domain = 'EYE'
";
$params = array("$t");

$query = $db->prepare($mainQry);
$query->execute($params);
$worOrderInfo =  $query->fetch(PDO::FETCH_ASSOC);

$errorMessage = false;

if($checkValidation['enable_validation']){
    if($routingOps == 10){
        if($pickInfo && $pickInfo['qty_open'] != 0){
            $errorMessage = "Pick not complete.";
        }
        if($routingInfo && $routingInfo['open_qty'] > 0){
            $errorMessage = "System shows an open qty of " . $routingInfo['open_qty'] . " in routing ". $routingOps . ". Unable to move to next queue.";
        }
    }else if($routingOps == 20){
        if($routingInfo && $routingInfo['open_qty'] > 0){
            $errorMessage = "System shows an open qty of " . $routingInfo['open_qty'] . " in routing ". $routingOps . ". Unable to move to next queue.";
        }
    }else if($routingOps == 30){
        if($routingInfo && $routingInfo['open_qty'] > 0){
            $errorMessage = "System shows an open qty of " . $routingInfo['open_qty'] . " in routing ". $routingOps . ". Unable to move to next queue.";
        }
    }
}

$data = array(
    "test" => $_GET['route'],
    "route" => $routingOps,
    "currentRoutingSelection" => $routingOps,
    "workOrder" => $t,
    "worOrderInfo" => $worOrderInfo,
    "errorMessage" => $errorMessage,
    "checkValidation" => $checkValidation,
    "pickInfo" => $pickInfo,
    "routingInfo" => $routingInfo
    
);

echo $db_connect->json_encode($data);
