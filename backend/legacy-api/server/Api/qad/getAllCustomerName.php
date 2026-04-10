<?php
use EyefiDb\Databases\DatabaseQad;

$db_connect = new DatabaseQad();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_LOWER);

$mainQry = "
    select cm_addr, cm_sort, cm_active
    from cm_mstr a
    WHERE a.cm_domain = 'EYE'
        AND cm_active = 1
    ORDER BY cm_sort ASC
";
  
$query = $db->prepare($mainQry);
$query->execute();
$results =  $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
