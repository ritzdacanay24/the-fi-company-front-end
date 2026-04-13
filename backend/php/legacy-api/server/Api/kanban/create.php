<?php

    require '/var/www/html/server/Databases/DatabaseEyefiV1.php';
        
    try {

        $_POST = json_decode(file_get_contents("php://input"), true);

        $table_name = "kanban_details";

        $_POST['last_transaction_date'] =  date("Y-m-d H:i:s");
        
        $data = $database->insert($table_name, $_POST);

        echo json_encode(array("insertId" => $database->id()));
    }

    //catch exception
    catch(Exception $e) {
        http_response_code(500);
        die($e->getMessage());
    }
