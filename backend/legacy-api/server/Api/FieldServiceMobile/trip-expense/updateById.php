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

    
    $_POST['created_by'] =  $_POST['created_by'] =="null" ? null : $_POST['created_by'] ;
    $_POST['copiedFromTicketId'] =  $_POST['copiedFromTicketId'] =="null" ? null : $_POST['copiedFromTicketId'] ;

    $qry = dynamicUpdate($table, $_POST, $_GET['id']);

    $query = $db->prepare($qry);
    $query->execute();

    echo $db_connect->json_encode($_POST);


    function upload(){
        
        $filename = basename($_FILES['file']['name']);
        $file1 = $_FILES['file']['tmp_name'];

        $time = time();        
        
        $target = '/var/www/html/attachments/fieldService/' . $time . "_" . $filename;

        $fileName_ = $time . "_" . $filename;

        $move = move_uploaded_file($file1, $target);


        if($move){
            return $fileName_;
        }else{
            return false;
        }

    }
