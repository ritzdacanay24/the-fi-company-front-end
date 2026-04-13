<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$_POST = json_decode(file_get_contents("php://input"), true);

$partNumber = trim($_POST['partNumber']);
$cycleTime = $_POST['cycleTime'] == "" ? null : $_POST['cycleTime'];
$updatedBy = $_POST['updatedBy'];

$mainQry = "
    select *
    from shipping_cycle_times
    where partNumber = :partNumber
";
$query = $db->prepare($mainQry);
$query->bindParam(':partNumber', $partNumber, PDO::PARAM_STR);
$query->execute();
$results = $query->fetch(PDO::FETCH_ASSOC);

if($results){
    $mainQry = "
        update shipping_cycle_times
        set cycleTime = :cycleTime,
            updatedDate = now(),
            updatedBy = :updatedBy
        where partNumber = :partNumber
    ";
    $query = $db->prepare($mainQry);
    $query->bindParam(':cycleTime', $cycleTime, PDO::PARAM_STR);
    $query->bindParam(':updatedBy', $updatedBy, PDO::PARAM_STR);
    $query->bindParam(':partNumber', $partNumber, PDO::PARAM_STR);
    $query->execute();
    echo $db_connect->json_encode($results);
} else{
    $mainQry = "
        INSERT INTO shipping_cycle_times (cycleTime, partNumber, updatedBy, updatedDate)
        VALUES (:cycleTime, :partNumber, :updatedBy, now()) 
    ";
    $query = $db->prepare($mainQry);
    $query->bindParam(':cycleTime', $cycleTime, PDO::PARAM_STR);
    $query->bindParam(':partNumber', $partNumber, PDO::PARAM_STR);
    $query->bindParam(':updatedBy', $updatedBy, PDO::PARAM_STR);
    $query->execute();
    $last_id = $db->lastInsertId();
    echo $db_connect->json_encode(array("insertId" => $last_id));
}

