<?php
    use EyefiDb\Databases\DatabaseEyefi;

    $db_connect = new DatabaseEyefi();
    $db = $db_connect->getConnection();
    $db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);
    $db->setAttribute(PDO::ATTR_ORACLE_NULLS, PDO::NULL_EMPTY_STRING);

    require "/var/www/html/server/Api/FieldServiceMobile/functions/index.php";

    $table = 'fs_workOrderTrip';


    if($_FILES){
        $_POST['fileName'] = upload();
    }
    

    $_POST['locale'] = ISSET($_POST['locale']) ? $_POST['locale'] : null;
    $_POST['date'] = ISSET($_POST['date']) ? $_POST['date'] : null;
    $_POST['time'] = ISSET($_POST['time']) ? $_POST['time'] : null;
    $_POST['copiedFromTicketId'] = ISSET($_POST['copiedFromTicketId']) ? null : null;
    

    $qry = dynamicInsert($table, $_POST);
    
    $query = $db->prepare($qry);
    $query->execute();
    $last_id = $db->lastInsertId();

    echo $db_connect->json_encode(array("insertId" => $last_id));

    function upload(){
        
        $filename = basename($_FILES['file']['name']);
        $file1 = $_FILES['file']['tmp_name'];

    
        $time = time();        
        
        $target = '/var/www/html/attachments/fieldService/' . $time . "_" . $filename;
        

        $fileName_ = $time . "_" . $filename;

        //$compressedImage = compressImage($file1, $target, 75); 
        $move = move_uploaded_file($file1, $target);

        if($move){
            return $fileName_;
        }else{
            return false;
        }

    }

    