<?php
    use EyefiDb\Databases\DatabaseEyefi;

    $db_connect = new DatabaseEyefi();
    $db = $db_connect->getConnection();
    $db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);
    $db->setAttribute(PDO::ATTR_ORACLE_NULLS, PDO::NULL_EMPTY_STRING);

    require "/var/www/html/server/Api/FieldServiceMobile/functions/index.php";

    $_POST = json_decode(file_get_contents("php://input"), true);


    
    try {

        $db->beginTransaction();

        //check if the group matches
        $mainQry = "
            select *
            from fs_travel_det
            where id = :id
        ";
        $query = $db->prepare($mainQry);
        $query->bindParam(':id', $_GET['id'], PDO::PARAM_STR);
        $query->execute();
        $results =  $query->fetch(PDO::FETCH_ASSOC);

        if($results['fs_travel_header_id'] != $_POST['fs_travel_header_id']){
            $mainQry = "
                update fs_travel_det 
                set fs_travel_header_id = :fs_travel_header_id
                where fsId = :fsId
            ";
            $query = $db->prepare($mainQry);
            $query->bindParam(':fs_travel_header_id', $_POST['fs_travel_header_id'], PDO::PARAM_STR);
            $query->bindParam(':fsId', $_POST['fsId'], PDO::PARAM_STR);
            $query->execute();
        }

        $table = 'fs_travel_det';

        $qry = dynamicInsert($table, $_POST);
        
        $query = $db->prepare($qry);
        $query->execute();
        $_POST['id'] = $db->lastInsertId();

        $db->commit();
        echo $db_connect->json_encode($_POST);
    }   
    //catch exception
    catch(Exception $e) {
        $db->rollBack();
        http_response_code(500);
        die($e->getMessage());
    }
