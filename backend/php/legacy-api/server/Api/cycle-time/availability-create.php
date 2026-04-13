<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$_POST = json_decode(file_get_contents("php://input"), true);

$employees = $_POST['employees'] == "" ? null : $_POST['employees'];
$date = $_POST['date'];

$mainQry = "
    select *
    from weekly_users
    where date = :date
";
$query = $db->prepare($mainQry);
$query->bindParam(':date', $date, PDO::PARAM_STR);
$query->execute();
$results = $query->fetch(PDO::FETCH_ASSOC);

if($results){
    $mainQry = "
        update weekly_users
        set employees = :employees
        where date = :date
    ";
    $query = $db->prepare($mainQry);
    $query->bindParam(':employees', $employees, PDO::PARAM_STR);
    $query->bindParam(':date', $date, PDO::PARAM_STR);
    $query->execute();
    echo $db_connect->json_encode($results);
} else{
    $mainQry = "
        INSERT INTO weekly_users (employees, date)
        VALUES (:employees, :date) 
    ";
    $query = $db->prepare($mainQry);
    $query->bindParam(':employees', $employees, PDO::PARAM_STR);
    $query->bindParam(':date', $date, PDO::PARAM_STR);
    $query->execute();
    $last_id = $db->lastInsertId();
    echo $db_connect->json_encode(array("insertId" => $last_id));
}

