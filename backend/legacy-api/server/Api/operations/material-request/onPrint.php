<?php
    require '/var/www/html/server/Databases/DatabaseEyefiV1.php';
    
    $database->pdo->beginTransaction();

    try {

        $_POST = json_decode(file_get_contents("php://input"), true);

        
        $sth = $database->pdo->prepare("
            SELECT COUNT(id) hits, mrf_id
            FROM mrf_det 
            WHERE mrf_id = :id 
            AND printedDate IS NOT NULL
            GROUP BY mrf_id
        ");
        
        $sth->bindParam(':id', $_POST['id'], PDO::PARAM_INT);
        
        $sth->execute();


        $mrfInfo = $sth->fetch(PDO::FETCH_ASSOC);

        if($mrfInfo['hits'] > 0){
            $database->pdo->rollBack();
            http_response_code(400);
            die("This MR is already printed.");
        }

        $table_name = "mrf_det";

        foreach($_POST['details'] as $row){
            $data = $database->update($table_name, array("printedBy"=>$row['printedBy'],"printedDate"=>$row['printedDate']), [
                "id" => $row['id']
            ]);
        }
        
        $database->pdo->commit();

        echo json_encode(array("rowCount" => $data->rowCount(), "printed" => $mrfInfo));

    } catch (PDOException $e) {
        $database->pdo->rollBack();
        http_response_code(500);
        die($e->getMessage());
    }


   