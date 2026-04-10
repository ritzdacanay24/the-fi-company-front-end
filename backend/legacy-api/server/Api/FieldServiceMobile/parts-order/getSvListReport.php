<?php
use EyefiDb\Databases\DatabaseQad;
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseQad();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$db_connect_eyefi = new DatabaseEyefi();
$db_eyefi = $db_connect_eyefi->getConnection();
$db_eyefi->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$mainQry = "
    select top 100 *
    from sod_det 
    where sod_domain = 'EYE'
        AND sod_nbr LIKE '%SV%'
";
$query = $db->prepare($mainQry);
$query->execute();
$results =  $query->fetchAll(PDO::FETCH_ASSOC);


$mainQry = "
    select top 100 *
    from sod_det 
    where sod_domain = 'EYE'
        AND sod_nbr LIKE '%SV%'
";
$query = $db_eyefi->prepare($mainQry);
$query->execute();
$requests =  $query->fetchAll(PDO::FETCH_ASSOC);

foreach($requests as $row)

echo $db_connect->json_encode($results);
