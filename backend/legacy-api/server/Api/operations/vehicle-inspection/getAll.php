<?php
    require '/var/www/html/server/Databases/DatabaseForm.php';

    $mainQry = "
        select *
        from forms.shipping_request
    ";

    $data = $database->query($mainQry)->fetchAll();

    echo json_encode($data);
