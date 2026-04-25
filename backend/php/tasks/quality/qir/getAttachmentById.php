<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

if(ISSET($_GET['id'])){
    $mainQry = "
        select *
        from attachments
        where uniqueId = :id
        and field = 'Capa Request'
    ";
    $query = $db->prepare($mainQry);
    $query->bindParam(':id', $_GET['id'], PDO::PARAM_STR);
    $query->execute();
    $results =  $query->fetchAll(PDO::FETCH_ASSOC);

    echo $db_connect->json_encode($results);
}else{
    echo $db_connect->json_encode(array());
}

