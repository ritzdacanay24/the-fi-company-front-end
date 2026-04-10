<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$mainQry = "
    select a.*
    from kanban_details a
";

$i = 1;
foreach ($_GET as $key => $value) {
    if ($i == 1){
        $mainQry .= "where ";
     }else{
        $mainQry .= " and ";
     }

     $mainQry .=  "a.".$key . " = '$value'";

     $i++;
 }

$query = $db->prepare($mainQry);
$query->execute();
$results =  $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
