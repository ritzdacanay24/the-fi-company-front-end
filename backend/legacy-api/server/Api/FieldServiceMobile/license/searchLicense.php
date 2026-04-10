<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$mainQry = "
    SELECT a.*
    FROM fs_license_property a 
    WHERE property LIKE ?
    and active = 1
";

$t = $_GET['text'];

$params = array("%$t%");

$query = $db->prepare($mainQry);
$query->execute($params);
$results = $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
 