<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$mainQry = "
    select *
    from fs_vendors
";

if(ISSET($_GET['selectedViewType']) && $_GET['selectedViewType'] == 'Active'){
    $mainQry .= " Where active = 1";
}else if(ISSET($_GET['selectedViewType']) && $_GET['selectedViewType'] == 'Inactive'){
    $mainQry .= " Where active = 0 || active IS NULL";
}

$query = $db->prepare($mainQry);
$query->execute();
$results =  $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
