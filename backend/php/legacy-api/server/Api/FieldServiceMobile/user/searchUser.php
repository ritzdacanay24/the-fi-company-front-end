<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$mainQry = "
    SELECT a.*, 
        case when first IS NOT NULL AND last IS NOT NULL THEN concat(first, ' ', last) ELSE first END username
    FROM db.users a 
    WHERE ( LOWER(concat(first, ' ', last)) LIKE ? ) OR LOWER(first) LIKE ?
";

$t = $_GET['text'];

$params = array("%$t%", "%$t%");

$query = $db->prepare($mainQry);
$query->execute($params);
$results = $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
