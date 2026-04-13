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

$mainQry = "
    select * 
    from kanban 
    where id = :id
";

$query = $dbFi->prepare($mainQry);
$query->bindParam(':id', $queue, PDO::PARAM_STR);
$query->execute();
$checkValidation =  $query->fetch(PDO::FETCH_ASSOC);

$t = $_GET['wo_nbr'];
$route = $_GET['route'];

$mainQry = "
    select wod_nbr
        , (a.wod_qty_req - a.wod_qty_iss) wod_completed
        , (a.wod_qty_req - a.wod_qty_iss) qty_wod_open
        , wr_status
        , cast(a.wod_qty_req as numeric(36,0)) wod_qty_req
        , cast(a.wod_qty_iss as numeric(36,0)) wod_qty_iss
        , wr_qty_ord
        , wr_qty_comp
        , wr_completed
    from wod_det a
    left join ( 
        select  cast(a.wr_qty_ord as numeric(36,0)) wr_qty_ord
            , cast(a.wr_qty_comp as numeric(36,0)) wr_qty_comp 
            , (a.wr_qty_ord - a.wr_qty_comp) wr_completed
            , (a.wr_qty_ord - a.wr_qty_comp) qty_routing_open
            , wr_status
            , a.wr_nbr
        from wr_route a 
        where wr_domain = 'EYE' 
            and wr_op = ?
            ) b on b.wr_nbr = a.wod_nbr
    where wod_nbr = ? and wod_domain = 'EYE'
";

$params = array("$route","$t");

$query = $db->prepare($mainQry);
$query->execute($params);
$results =  $query->fetch(PDO::FETCH_ASSOC);

$errorMessage = false;

if($checkValidation['enable_validation']){
    if($results['qty_wod_open'] > 0){
        $errorMessage = "You completed " . $results['wod_qty_iss'] . ' out of ' . $results['wod_qty_req'] . " in work order detail. Unable to move to next queue.";
    }else if($results['wr_qty_comp'] > 0){
        $errorMessage = "You completed " . $results['wod_qty_iss'] . ' out of ' . $results['wod_qty_req'] . " in routing. Unable to move order to next queue";
    }
}

$data = array(
    "results" => $results,
    "errorMessage" => $errorMessage,
    "checkValidation" => $checkValidation
    
);

echo $db_connect->json_encode($data);
