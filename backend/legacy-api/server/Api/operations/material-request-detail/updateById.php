<?php
    require '/var/www/html/server/Databases/DatabaseEyefiV1.php';
    
    $database->pdo->beginTransaction();

    try {

        $_POST = json_decode(file_get_contents("php://input"), true);

        $table_name = "mrf";

        $header = $_POST['main'];
        $details = $_POST['details'];

        $data = $database->update($table_name, $header, [
            "id" => $_GET['id']
        ]);

        foreach($details as $row){

            if(ISSET($row['id'])){
                $data = $database->update('mrf_det', $row, [
                    "id" => $row['id']
                ]);
            }else{
                $row['mrf_id'] = $_GET['id'];
                $data = $database->insert('mrf_det', $row);
            }

        }

        
        $database->pdo->commit();

        echo json_encode(array("rowCount" => $data->rowCount()));

    } catch (PDOException $e) {
        $database->pdo->rollBack();
        http_response_code(500);
        die($e->getMessage());
    }


   