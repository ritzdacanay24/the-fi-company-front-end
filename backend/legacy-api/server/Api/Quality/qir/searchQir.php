<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_LOWER);

$t = $_GET['text'];

$mainQry = "
SELECT *
FROM qa_capaRequest 
WHERE id LIKE ?
OR qir LIKE ?
";

$params = array("%$t%","%$t%");

$query = $db->prepare($mainQry);
$query->execute($params);
$results =  $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);