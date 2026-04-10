<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$mainQry = "
    select *
    from fs_license_property
    where id = :id
";
$query = $db->prepare($mainQry);
$query->bindParam(':id', $_GET['id'], PDO::PARAM_STR);
$query->execute();
$results =  $query->fetch(PDO::FETCH_ASSOC);

$results['property_phone'] = implodeData($results, 'property_phone');

function implodeData($data, $value){
    return ISSET($data[$value]) && $data[$value] != "" ? explode(',', $data[$value]) : null;
}


$mainQry = "
    select *
    from fs_licensed_techs
    where fs_licensed_id = :id
";
$query = $db->prepare($mainQry);
$query->bindParam(':id', $_GET['id'], PDO::PARAM_STR);
$query->execute();
$licensed_techs =  $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode_v1(
    array(
        "results" => $results,
        "licensed_techs" => $licensed_techs
    ));
