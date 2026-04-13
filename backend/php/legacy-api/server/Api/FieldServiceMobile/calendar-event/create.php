<?php
    use EyefiDb\Databases\DatabaseEyefi;

    $db_connect = new DatabaseEyefi();
    $db = $db_connect->getConnection();
    $db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);
    $db->setAttribute(PDO::ATTR_ORACLE_NULLS, PDO::NULL_EMPTY_STRING);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    require "/var/www/html/server/Api/FieldServiceMobile/functions/index.php";

    $_POST = json_decode(file_get_contents("php://input"), true);

    try {  
        
        $db->beginTransaction();

        /**event */
        $table = 'fs_calendar';

        $qry = dynamicInsert($table, $_POST['event']);

        $query = $db->prepare($qry);
        $query->execute();
        $id =$db->lastInsertId();

        /**job */
        if(ISSET($_POST['job'])){
            $_POST['job']['fs_calendar_id'] = $id;
            $table = 'fs_scheduler';

            $qry = dynamicInsert($table, $_POST['job']);
            
            $query = $db->prepare($qry);
            $query->execute();
            $db->lastInsertId();
        };

        $db->commit();
  
        echo $db_connect->json_encode($_POST);
    } catch (Exception $e) {
        $db->rollBack();
        echo "Failed: " . $e->getMessage();
    }
