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

        $table = 'fs_license_property';

        $_POST['data']['property_phone'] = ISSET($_POST['data']['property_phone']) ? implode(',',$_POST['data']['property_phone']) : null;

        $qry = dynamicInsertV1($table, $_POST['data']);
        $query = $db->prepare($qry);
        $query->execute();
        $last_id = $db->lastInsertId();

        
        if(count($_POST['techs']) > 0){
            $table = 'fs_licensed_techs';

            foreach($_POST['techs'] as $row){
                $row['fs_licensed_id'] = $last_id;
                $qry = dynamicInsertV1($table, $row);
                $query = $db->prepare($qry);
                $query->execute();
            }
        }

        $db->commit();

        echo $db_connect->json_encode(array("insertId" => $last_id));
    }   
        //catch exception
        catch(Exception $e) {
            $db->rollBack();
            http_response_code(500);
            die($e->getMessage());
        }


