<?php
    require '/var/www/html/server/Databases/DatabaseForm.php';

    $mainQry = "
        select *
        from forms.forklift_checklist
    ";

    $data = $database->query($mainQry)->fetchAll();

    echo json_encode($data);
