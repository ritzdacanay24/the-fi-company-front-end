<?php
    require '/var/www/html/server/Databases/DatabaseEyefiV1.php';
    
    $database->pdo->beginTransaction();

    try {

        $_POST = json_decode(file_get_contents("php://input"), true);

        $sth = $database->pdo->prepare("
            SELECT id
            FROM mrf 
            WHERE id = :id 
            AND pickedCompletedDate IS NOT NULL
        ");
        
        $sth->bindParam(':id', $_POST['id'], PDO::PARAM_INT);
        
        $sth->execute();

        $mrfInfo = $sth->fetch(PDO::FETCH_ASSOC);

        if(ISSET($mrfInfo) && $mrfInfo['id']){
            $database->pdo->rollBack();
            http_response_code(400);
            die("This MR is already completed.");
        }
        
        $data = $database->update('mrf', array("pickedCompletedDate" => $_POST['pickedCompletedDate'] ), [
            "id" => $_POST['id']
        ]);

        $jobNumber = time() . '-' . $_POST['id'];

        foreach($_POST['details'] as $row){
            
            $database->update('mrf_det', array("qtyPicked" => $row['qtyPicked'] ), [
                "id" => $row['id']
            ]);

            if($row['qtyPicked'] != $row['qty'] && $row['qty'] > 0){
                $database->insert("shortageRequest", array(
                    "jobNumber" => $jobNumber,
                    "woNumber" => $_POST['pickList'],
                    "lineNumber" => $_POST['lineNumber'],
                    "dueDate" => $_POST['dueDate'],
                    "reasonPartNeeded" => 'Material request shortages',
                    "priority" => $_POST['priority'],
                    "assemblyNumber" => $_POST['assemblyNumber'],
                    "mrfId" =>  $_POST['id'],

                    "createdBy" => $row['shortageCreatedBy'],
                    "partNumber" =>  $row['partNumber'],
                    "qty" =>  $row['qty'] - $row['qtyPicked'],
                    "comments" =>  '',
                    "partDesc" =>  $row['itemDescription'],
                    "graphicsShortage" =>  'false',
                    "mrf_line" =>  $row['id'],
                ));
            }
            
        }
        
        $database->pdo->commit();

        echo json_encode(array("rowCount" => $data->rowCount()));

    } catch (PDOException $e) {
        $database->pdo->rollBack();
        http_response_code(500);
        die($e->getMessage());
    }


   