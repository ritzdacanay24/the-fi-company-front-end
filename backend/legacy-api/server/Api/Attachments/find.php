<?php
    use EyefiDb\Databases\DatabaseEyefi;

    $db_connect = new DatabaseEyefi();
    $db = $db_connect->getConnection();
    $db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);
    $db->setAttribute(PDO::ATTR_ORACLE_NULLS, PDO::NULL_EMPTY_STRING);

    require "/var/www/html/server/Api/FieldServiceMobile/functions/index.php";

    $table = 'attachments';

    $qry = dynamicFind($table);
    $qry .= " order by case when date_of_service IS NOT NULL then date_of_service else id END desc";
    
    $query = $db->prepare($qry);
    $query->execute();
    $results =  $query->fetchAll(PDO::FETCH_ASSOC);

    echo $db_connect->json_encode($results);