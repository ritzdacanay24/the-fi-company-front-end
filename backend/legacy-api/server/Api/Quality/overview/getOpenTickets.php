<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$mainQry = "
    SELECT count(*) hits
    from qa_capaRequest a
    WHERE a.active = 1 
    AND a.status = 'Open'
    AND TYPE1 LIKE '%External%'
";

$query = $db->prepare($mainQry);
$query->execute();
$results =  $query->fetch(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
