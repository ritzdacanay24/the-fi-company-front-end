<?php
    use EyefiDb\Databases\DatabaseEyefi;

    $db_connect = new DatabaseEyefi();
    $db = $db_connect->getConnection();
    $db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);
    $db->setAttribute(PDO::ATTR_ORACLE_NULLS, PDO::NULL_EMPTY_STRING);

    require "/var/www/html/server/Api/FieldServiceMobile/functions/index.php";

    $_POST = json_decode(file_get_contents("php://input"), true);

    $table = 'ncr_complaint_codes';

    $qry = dynamicInsertV1($table, $_POST);
    
    
    $query = $db->prepare($qry);
    $query->execute();
    $last_id = $db->lastInsertId();

    echo $db_connect->json_encode(array("insertId" => $last_id));
