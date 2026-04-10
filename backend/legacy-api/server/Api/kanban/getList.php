<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);


use EyefiDb\Databases\DatabaseQad;
$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();
$dbQad->setAttribute(PDO::ATTR_CASE, PDO::CASE_LOWER);


$wo_nbr = ISSET($_GET['wo_nbr']) && $_GET['wo_nbr'] != "undefined" ? $_GET['wo_nbr'] : null;

$mainQry = "
    select *
    from kanban a 
    where show_column = 1
    order by seq ASC
";

$query = $db->prepare($mainQry);
$query->execute();
$queues =  $query->fetchAll(PDO::FETCH_ASSOC);

$mainQry = "
    select a.*,
        JSON_OBJECT(
            'id', b.id
        ) comment,
        JSON_OBJECT(
            'printedDate', c.printedDate
        ) print_details,
        TIMESTAMPDIFF(MINUTE, last_transaction_date, now()) timeDiffMins,
        d.routing
    from kanban_details a 
    left join (
        select count(orderNum) id, orderNum
        from comments 
        where type = 'kanban'
        group by orderNum
    ) b ON b.orderNum = a.wo_nbr
    left join (
        select workOrder, max(printedDate) printedDate
        from workOrderPrintDetails 
        group by workOrder
    ) c ON c.workOrder = a.wo_nbr
    left join kanban d on d.id = a.kanban_ID
    
";

$mainQry .= "order by (hot_order IS NULL) ASC, 
last_transaction_date asc";

$query = $db->prepare($mainQry);
$query->execute();
$resultDetails =  $query->fetchAll(PDO::FETCH_ASSOC);

$totalOrders = count($resultDetails);


$in_array = array();
foreach ($resultDetails as $row) {
    $in_array[] = $row['wo_nbr'];
}
$in = "'" . implode("','", $in_array) . "'";


$mainQry = "
    select wod_nbr
        , sum(a.wod_qty_req - a.wod_qty_iss) open_qty
        , cast(sum(a.wod_qty_req) as numeric(36,1)) wod_qty_req
        , cast(sum(a.wod_qty_iss) as numeric(36,1)) wod_qty_iss
    from wod_det a
    where wod_nbr IN ($in)
    and wod_domain = 'EYE'
    group by wod_nbr
";
$query = $dbQad->prepare($mainQry);
$query->execute();
$wod_info =  $query->fetchAll(PDO::FETCH_ASSOC);

$mainQry = "
    select cast(a.wr_qty_ord as numeric(36,0)) wr_qty_ord
        , cast((a.wr_qty_ord - a.wr_qty_comp) as numeric(36,0))  open_qty
        , cast(a.wr_qty_comp as numeric(36,0)) wr_qty_comp
        , a.wr_nbr
        , wr_op
        , wr_queue
        , wr_qty_move
        , wr_status
        , WR_QTY_INQUE
    from wr_route a 
    where wr_domain = 'EYE' 
    and wr_nbr IN ($in)
";
$query = $dbQad->prepare($mainQry);
$query->execute();
$wod_routing_info =  $query->fetchAll(PDO::FETCH_ASSOC);

$mainQry = "
    select a.wo_routing
        , a.wo_line
        , a.wo_nbr
        , wo_qty_ord
        , wo_qty_comp
        , wo_part
        , wo_due_date
        , wo_status
        , CONCAT(pt_desc1, pt_desc2) fullDesc
        , wo_rmks
    from wo_mstr a 
    
    LEFT JOIN ( 
        select pt_part
            , max(pt_desc1) pt_desc1
            , max(pt_desc2) pt_desc2
        from pt_mstr
        WHERE pt_domain = 'EYE'
        group by pt_part
    ) b ON b.pt_part = a.wo_part

    where wo_domain = 'EYE' 
    and wo_nbr IN ($in)
";
$query = $dbQad->prepare($mainQry);
$query->execute();
$wo_info =  $query->fetchAll(PDO::FETCH_ASSOC);

$details = array();

foreach ($queues as &$queue_row) {
    $queue_status = $queue_row['id'];
    
    foreach ($resultDetails as $resultDetails_row) {


        $resultDetails_row['comment'] = json_decode($resultDetails_row['comment'], true);
        $resultDetails_row['print_details'] = json_decode($resultDetails_row['print_details'], true);
        
        $status = $resultDetails_row['kanban_ID'];

        $resultDetails_row['queueInfo'] = $resultDetails_row;

        $resultDetails_row['pickInfo'] = null;
        $resultDetails_row['routingInfo'] = null;
        $resultDetails_row['allRoutingInfo'] = [];
        $resultDetails_row['wo_mstr'] = null;
        $resultDetails_row['qad_current_queue'] = null;

        $dueDate = "";
        $resultDetails_row['due_by'] = "";

        foreach ($wo_info as $wo_info_row) {
            if ($resultDetails_row['wo_nbr'] == $wo_info_row['wo_nbr']) {
                $resultDetails_row['wo_mstr'] = $wo_info_row;
                $dueDate = $wo_info_row['wo_due_date'];
            }
        }

        foreach ($wod_info as $wod_info_row) {
            if ($resultDetails_row['wo_nbr'] == $wod_info_row['wod_nbr']) {
                $resultDetails_row['pickInfo'] = $wod_info_row;
            }
        }

        foreach ($wod_routing_info as $wod_routing_info_row) {
            if($resultDetails_row['wo_nbr'] == $wod_routing_info_row['wr_nbr']){
                if($resultDetails_row['routing'] == $wod_routing_info_row['wr_op']){
                    if($wod_routing_info_row['wr_op'] == 10){
                        $resultDetails_row['due_by'] = date('Y-m-d', strtotime($dueDate . ' -2 weekday'));
                    }else if($wod_routing_info_row['wr_op'] == 20){
                        $resultDetails_row['due_by'] = date('Y-m-d', strtotime($dueDate . ' -1 weekday'));
                    } else if($wod_routing_info_row['wr_op'] == 30){
                        $resultDetails_row['due_by'] = date('Y-m-d', strtotime($dueDate . ' 0 weekday'));
                    }    
                }

                if($wod_routing_info_row['wr_status'] == "Q"){
                    $resultDetails_row['qad_current_queue'] = $wod_routing_info_row;
                }

                $resultDetails_row['allRoutingInfo'][] = $wod_routing_info_row;
            }
        }

        if($resultDetails_row['due_by'] == ''){
            $resultDetails_row['due_by'] = date('Y-m-d', strtotime($dueDate));
        }

        if ($queue_status == $status) {
            $details[] = $resultDetails_row;
        }
    }
}

$data = array(
    "totalOrders" => $totalOrders,
    "queues" => $queues,
    "details" => $details
);


echo $db_connect->json_encode($data);

