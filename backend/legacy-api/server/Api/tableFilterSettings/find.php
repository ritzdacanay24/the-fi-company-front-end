<?php
    use EyefiDb\Databases\DatabaseEyefi;

    $db_connect = new DatabaseEyefi();
    $db = $db_connect->getConnection();
    $db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);
    $db->setAttribute(PDO::ATTR_ORACLE_NULLS, PDO::NULL_EMPTY_STRING);

    require "/var/www/html/server/Api/FieldServiceMobile/functions/index.php";

    $table = 'tableFilterSettings a';

    $sqlStyle = "Select a.*, concat(b.first, ' ', b.last) created_by_user From $table left join db.users b on b.id = a.userId ";
    $i = 1;
    foreach ($_GET as $key => $value) {
        if ($i == 1){
            $sqlStyle .= "where ";
         }else{
            $sqlStyle .= " and ";
         }

         $sqlStyle .=  $key . " = '$value'";

         $i++;
     }

    
    $query = $db->prepare($sqlStyle);
    $query->execute();
    $results =  $query->fetchAll(PDO::FETCH_ASSOC);

    echo $db_connect->json_encode($results);