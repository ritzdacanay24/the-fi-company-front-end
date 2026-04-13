<?php
    use EyefiDb\Databases\DatabaseEyefi;
    use EyefiDb\Config\Protection;

    $db_connect = new DatabaseEyefi();
    $db = $db_connect->getConnection();
    $db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);
    $db->setAttribute(PDO::ATTR_ORACLE_NULLS, PDO::NULL_EMPTY_STRING);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $protected = new Protection();
    $protectedResults = $protected->getProtected();
    $userInfo = $protectedResults->data;
    $data->user_full_name = $userInfo->full_name;

    require "/var/www/html/server/Api/FieldServiceMobile/functions/index.php";

    $_POST = json_decode(file_get_contents("php://input"), true);

     function AuthUsers()
    {
        return (object) array(
            'edit' => array(
                'Ritz Dacanay',
                'Adriann Kamakahukilani',
                'Juvenal Torres',
                'Heidi Elya',
            )
        );
    }

     function AuthUserCheck($user_full_name,$accessSection)
    {
        if (in_array($user_full_name, $accessSection)) {
            return true;
        }
        return false;
    }
    

    try {  
        
        $db->beginTransaction();
        
        if (!$AuthUserCheck($AuthUsers()->edit)) {
            throw new PDOException("Access Denied. ", 401);
        }

        /**event */
        $table = 'fs_calendar';

        $qry = dynamicInsert($table, $_POST['event']);

        $query = $db->prepare($qry);
        $id = $query->execute();

        /**job */
        
        $_POST['job']['fs_calendar_id'] = $id;
        $table = 'fs_scheduler';

        $qry = dynamicInsert($table, $_POST['job']);
        
        $query = $db->prepare($qry);
        $query->execute();
        $db->lastInsertId();


        $db->commit();
  
        echo $db_connect->json_encode($_POST);
    } catch (Exception $e) {
        $db->rollBack();
        echo "Failed: " . $e->getMessage();
    }
