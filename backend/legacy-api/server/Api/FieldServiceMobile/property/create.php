<?php
    use EyefiDb\Databases\DatabaseEyefi;

    $db_connect = new DatabaseEyefi();
    $db = $db_connect->getConnection();
    $db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);
    $db->setAttribute(PDO::ATTR_ORACLE_NULLS, PDO::NULL_EMPTY_STRING);

    require "/var/www/html/server/Api/FieldServiceMobile/functions/index.php";

    $_POST = json_decode(file_get_contents("php://input"), true);

    $table = 'fs_property_det';

    $_POST['licensed_techs'] = ISSET($_POST['licensed_techs']) ? implode(',', $_POST['licensed_techs']) : null;
    $_POST['compliance_phone_numbers'] = ISSET($_POST['compliance_phone_numbers']) ? implode(',', $_POST['compliance_phone_numbers']) : null;

    $qry = dynamicInsertV1($table, $_POST);
    
    
    $query = $db->prepare($qry);
    $query->execute();
    $last_id = $db->lastInsertId();

    echo $db_connect->json_encode(array("insertId" => $last_id));
