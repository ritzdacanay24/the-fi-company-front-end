<?php
    require '/var/www/html/server/Api/db_config.php';

    $enableTwostep = get_db_config('enableTwostep');

    echo json_encode($enableTwostep);
