<?php
    require '/var/www/html/server/Databases/DatabaseEyefiV1.php';
    
    $database->pdo->beginTransaction();

    try {

        $_POST = json_decode(file_get_contents("php://input"), true);

        $table_name = "mrf";

        $id = $_POST['id'];

        //check if mr is completed
        
        $sth = $database->pdo->prepare("
            SELECT *
            FROM mrf
            WHERE id = :id
        ");
        
        $sth->bindParam(':id', $id, PDO::PARAM_INT);
        
        $sth->execute();

        $mrfInfo =  $sth->fetch(PDO::FETCH_ASSOC);
    

        if(!$mrfInfo){
            throw new Exception('Material Request Not Found', 400);
        }

        if($mrfInfo['active'] == 0){
            throw new Exception('This Material Request is Deleted', 400);
        }

        if($mrfInfo['pickedCompletedDate']){
            throw new Exception('This Material Request is already completed', 400);
        }

        //check if printed

        $sth = $database->pdo->prepare("
            SELECT *
            FROM mrf_det
            WHERE mrf_id = :id
        ");
        
        $sth->bindParam(':id', $id, PDO::PARAM_INT);
        
        $sth->execute();

        $mrfDetails =  $sth->fetchAll(PDO::FETCH_ASSOC);

        $count = 0;
        foreach($mrfDetails as $row){
            if($row['printedDate']) $count++;
        }
        
        if($count > 0){
            throw new Exception('This material request is already printed. Clear print then send to the validation queue.', 400);
        }

        $data = $database->update($table_name, array("validated"=> null), [
            "id" => $_POST['id']
        ]);
        
        $database->pdo->commit();

        echo json_encode(array("rowCount" => $data->rowCount()));

    } catch (PDOException $e) {
        $database->pdo->rollBack();
        http_response_code($e->getCode());
        die($e->getMessage());
    }


   