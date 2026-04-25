<?php
use EyefiDb\Databases\DatabaseQad;

$db_connect = new DatabaseQad();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_LOWER);

$t = $_GET['text'];

$mainQry = "
SELECT wo_nbr
    , wo_due_date
    , wo_part
    , wo_qty_ord
    , wo_routing
    , wo_line, pt_desc1 || ' ' || pt_desc2 description 
    , cp_cust_part
    , cp_cust
FROM wo_mstr 
left join pt_mstr b on b.pt_part = wo_part
LEFT JOIN cp_mstr cp on cp.cp_part = wo_part
WHERE (wo_part LIKE ? OR wo_nbr LIKE ?)
and wo_domain = 'EYE'
ORDER BY wo_due_date DESC

";

$params = array("%$t%","%$t%");

$query = $db->prepare($mainQry);
$query->execute($params);
$results =  $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
