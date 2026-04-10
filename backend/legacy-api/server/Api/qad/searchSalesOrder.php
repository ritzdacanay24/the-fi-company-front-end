<?php
use EyefiDb\Databases\DatabaseQad;

$db_connect = new DatabaseQad();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_LOWER);

$t = $_GET['text'];

$mainQry = "
SELECT sod_part, sod_line, sod_nbr,  sod_nbr || '-' || CAST(sod_line AS CHAR(25)) sod_nbr_line 
FROM sod_det 
WHERE ( sod_nbr LIKE ? OR sod_nbr || '-' || CAST(sod_line AS CHAR(25)) LIKE ?  )
and sod_domain = 'EYE'
";

$params = array("%$t%","%$t%");

$query = $db->prepare($mainQry);
$query->execute($params);
$results =  $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
