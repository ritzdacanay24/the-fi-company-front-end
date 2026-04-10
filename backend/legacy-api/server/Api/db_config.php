<?php
use EyefiDb\Databases\DatabaseEyefi;
function get_db_config($name){

    $db_connect = new DatabaseEyefi();
    $db = $db_connect->getConnection();
    $db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

    $mainQry = "
        select *
        from db_config a
        where name = :name 
    ";
    $query = $db->prepare($mainQry);
    $query->bindParam(':name', $name, PDO::PARAM_STR);
    $query->execute();
    $data = $query->fetch(PDO::FETCH_ASSOC);

    return $data['value'];
    
}