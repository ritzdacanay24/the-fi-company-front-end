<?php
use EyefiDb\Databases\DatabaseQad;

$db_connect = new DatabaseQad();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_LOWER);

$t = $_GET['text'];

$mainQry = "
    SELECT a.cp_cust_part
        , b.pt_desc1 || '-' || b.pt_desc2 description 
        , b.pt_status
        , cp_cust
    FROM cp_mstr a
    LEFT JOIN pt_mstr b ON b.pt_part = a.cp_part
    WHERE a.cp_cust_part LIKE ?
    AND a.cp_domain = 'EYE'
";

$params = array("%$t%");

$query = $db->prepare($mainQry);
$query->execute($params);
$results =  $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
