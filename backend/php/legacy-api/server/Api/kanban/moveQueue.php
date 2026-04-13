<?php
    require '/var/www/html/server/Databases/DatabaseEyefiV1.php';
    
    $_POST = json_decode(file_get_contents("php://input"), true);

    $table = 'kanban_details';
    date_default_timezone_set('America/Los_Angeles');

    $last_transaction_date = date("Y-m-d H:i:s", time());

    
    $array = [
        "kanban_ID" => $_POST['kanban_ID'],
        "last_transaction_date" => $last_transaction_date
    ];

    $data = $database->update($table, $array, [
        "id" => $_GET['id']
    ]);

    $table = 'kanban_transactions';

    $database->insert('kanban_transactions', [
        "transaction_name" => 'queues_move',
        "created_by" => $_POST['created_by'],
        "kanban_ID" => $_POST['kanban_ID'],
        "transaction_date" => $last_transaction_date,
        "wo_nbr" => ISSET($_POST['wo_nbr']) ? $_POST['wo_nbr']: null
    ]);

    echo json_encode($array);