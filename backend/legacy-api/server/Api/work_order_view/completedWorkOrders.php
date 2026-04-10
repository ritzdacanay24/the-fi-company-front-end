<?php
use EyefiDb\Databases\DatabaseQad;

$db_connect = new DatabaseQad();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_LOWER);

$mainQry = "
    select a.wo_nbr, 
    a.wo_line, 
    a.wo_due_date, 
    a.wo_part, 
    a.wo_qty_ord, 
    a.wo_qty_comp, 
    wod_qty_req,  
    wod_qty_iss, 
    case when (wod_qty_iss >  wod_qty_req) THEN 'Yes' END wod_status,
    wo_status real_wod_status 
    from wo_mstr a   
    left join (
    select wod_nbr, sum(wod_qty_req) wod_qty_req, sum(wod_qty_iss) wod_qty_iss 
    from wod_det  
    group by wod_nbr 
    ) b ON b.wod_nbr = a.wo_nbr 
    where a.wo_domain = 'EYE'   
    and  a.wo_status NOT IN ('C','P','F','A')  
    and (a.wo_qty_comp - a.wo_qty_ord) = 0  
";

$query = $db->prepare($mainQry);
$query->execute();
$results =  $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
