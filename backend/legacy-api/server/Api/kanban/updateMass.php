<?php
    require '/var/www/html/server/Databases/DatabaseEyefiV1.php';
    
    $_POST = json_decode(file_get_contents("php://input"), true);

    $table = 'kanban_details';

    foreach($_POST as $row){

        $data = $database->update($table, [
            "seq" => $row['seq']
        ], [
            "id" => $row['id']
        ]);
    }


    echo json_encode($_POST);