<?php
use EyefiDb\Databases\DatabaseEyefi;

    $db_connect = new DatabaseEyefi();
    $db = $db_connect->getConnection();
    $db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

    $mainQry = "
        select *, substring_index(path, '?', 1) page
        from db.logInfo a
        where date(createdDate) = curDate()
        order by a.id desc
    ";
    $query = $db->prepare($mainQry);
    $query->execute();
    $data = $query->fetchAll(PDO::FETCH_ASSOC);

    echo $db_connect->json_encode($data);