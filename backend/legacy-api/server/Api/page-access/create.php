<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$_POST = json_decode(file_get_contents("php://input"), true);


$mainQry = "
    select *
    from page_access
    where user_id = :user_id
    and menu_id = :menu_id
";
$query = $db->prepare($mainQry);
$query->bindParam(':user_id', $_POST['user_id'], PDO::PARAM_STR);
$query->bindParam(':menu_id', $_POST['menu_id'], PDO::PARAM_STR);
$query->execute();
$results =  $query->fetch(PDO::FETCH_ASSOC);

if($results && $results['active'] == 0){
    $mainQry = "
        UPDATE page_access
        SET active = 1
        WHERE id = :id
    ";
    $query = $db->prepare($mainQry);
    $query->bindParam(':id', $results['id'], PDO::PARAM_STR);
    $query->execute();
}else if($results){
    $mainQry = "
        DELETE from page_access where id = :id
    ";
    $query = $db->prepare($mainQry);
    $query->bindParam(':id', $results['id'], PDO::PARAM_STR);
    $query->execute();
} else {

    $mainQry = "
        INSERT INTO page_access (
            user_id
            , menu_id
        ) VALUES (
            :user_id
            , :menu_id
        )
    ";
    $query = $db->prepare($mainQry);
    $query->bindParam(':user_id', $_POST['user_id'], PDO::PARAM_STR);
    $query->bindParam(':menu_id', $_POST['menu_id'], PDO::PARAM_STR);
    $query->execute();

}

echo $db_connect->json_encode($results);
