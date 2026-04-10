<?php

    require '/var/www/html/server/Databases/DatabaseEyefiV1.php';
        
    try {


        $_POST = json_decode(file_get_contents("php://input"), true);
        $_POST['created_date'] = date("Y-m-d H:i:s");

        $table_name = "geo_location_tracker";



        if($_POST['user_id'] != 3){
            $data = $database->insert($table_name, $_POST);
            echo json_encode(array("insertId" => $database->id()));
        }else{
            echo json_encode(array("message" => ""));

        }
    }
    //catch exception
    catch(Exception $e) {
        http_response_code(500);
        die($e->getMessage());
    }

