<?php
    use EyefiDb\Databases\DatabaseEyefi;

    $db_connect = new DatabaseEyefi();
    $db = $db_connect->getConnection();
    $db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);
    $db->setAttribute(PDO::ATTR_ORACLE_NULLS, PDO::NULL_EMPTY_STRING);

    require "/var/www/html/server/Api/FieldServiceMobile/functions/index.php";

    $table = 'customer_visit_log';

    $qry = dynamicDeleteById($table, $_GET['id']);
    
    $query = $db->prepare($qry);
    $query->execute();

    echo $db_connect->json_encode($qry);