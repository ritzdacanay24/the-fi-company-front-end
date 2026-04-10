<?php

    require '/var/www/html/server/Databases/DatabaseEyefiV1.php';
        
    $_POST = json_decode(file_get_contents("php://input"), true);

    $table_name = "kanban_timer";

    use EyefiDb\Databases\DatabaseEyefi;

    $db_connect = new DatabaseEyefi();
    $db = $db_connect->getConnection();
    $db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

    $mainQry = "
        select id
        from kanban_timer
        where wo_nbr = :wo_nbr
            and kanban_id = :kanban_id
    ";
    $query = $db->prepare($mainQry);
    $query->bindParam(':wo_nbr', $_POST['wo_nbr'], PDO::PARAM_STR);
    $query->bindParam(':kanban_id', $_POST['kanban_id'], PDO::PARAM_STR);
    $query->execute();
    $results =  $query->fetch(PDO::FETCH_ASSOC);

    if($results){
        $data = $database->update($table_name, $_POST, [
            "id" => $results['id']
        ]);
        echo json_encode("Updated");
    } else {
        $data = $database->insert($table_name, $_POST);
        echo json_encode(array("insertId" => $database->id()));
    }