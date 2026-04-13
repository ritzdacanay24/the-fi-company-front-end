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

        foreach($_POST['details'] as $row){
            $data = $database->update("mrf_det", array("printedBy"=>$row['printedBy'],"printedDate"=>$row['printedDate']), [
                "id" => $row['id']
            ]);
        }
        
        $database->pdo->commit();

        echo json_encode(array("rowCount" => $data->rowCount()));

    } catch (PDOException $e) {
        $database->pdo->rollBack();
        http_response_code(500);
        die($e->getMessage());
    }


   