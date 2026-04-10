<?php
    require '/var/www/html/server/Databases/DatabaseEyefiV1.php';
    require '/var/www/html/shared/userPermissionCheck.php';
    
    $_POST = json_decode(file_get_contents("php://input"), true);

    // $userPermission = userPermissionCheck("qir/edit", ISSET($_POST['createdBy']));

    // if(!$userPermission){
    //     http_response_code(403);
    //     die("You dont have permissions.");
    // }

    $data = $database->update("qa_capaRequest", $_POST, [
        "id" => $_GET['id']
    ]);

    echo json_encode($data);