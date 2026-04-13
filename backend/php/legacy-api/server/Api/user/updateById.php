
    <?php
    require '/var/www/html/server/Databases/DatabaseFormDb.php';
    
    $_POST = json_decode(file_get_contents("php://input"), true);

    $table = 'users';

    $data = $database->update($table, $_POST, [
        "id" => $_GET['id']
    ]);

    echo json_encode(array("results" => "updated"));