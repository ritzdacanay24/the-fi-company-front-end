<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$mainQry = "
    SELECT a.*, concat(first, ' ', last) username
    FROM db.users a 
    WHERE id IN (?)
";

$t = $_GET['text'];

$params = array("%$t%");

$query = $db->prepare($mainQry);
$query->execute($params);
$results = $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
