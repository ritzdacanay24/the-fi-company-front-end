<?php
use EyefiDb\Databases\DatabaseQad;
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseQad();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_LOWER);

$db_connect_fi = new DatabaseEyefi();
$dbFi = $db_connect_fi->getConnection();
$dbFi->setAttribute(PDO::ATTR_CASE, PDO::CASE_LOWER);

$mainQry = "
    select * 
    from kanban 
    where id = 2
";

$query = $dbFi->prepare($mainQry);
$query->execute();
$checkValidation =  $query->fetch(PDO::FETCH_ASSOC);

$t = $_GET['wo_nbr'];

$mainQry = "
    select wod_nbr
        , sum(a.wod_qty_req - a.wod_qty_iss) total
        , wr_status
    from wod_det a
    left join ( 
        select wr_nbr, wr_status
            from wr_route a 
            where wr_domain = 'EYE' and wr_op = 10
        ) b ON b.wr_nbr = a.wod_nbr
    where wod_nbr = ? and wod_domain = 'EYE'
    group by wod_nbr, wr_status
";

$params = array("$t");

$query = $db->prepare($mainQry);
$query->execute($params);
$results =  $query->fetch(PDO::FETCH_ASSOC);


echo $db_connect->json_encode($results);
