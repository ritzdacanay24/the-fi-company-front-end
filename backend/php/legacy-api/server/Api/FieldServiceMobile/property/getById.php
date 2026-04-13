<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$mainQry = "
    select *
    from fs_property_det
    where id = :id
";
$query = $db->prepare($mainQry);
$query->bindParam(':id', $_GET['id'], PDO::PARAM_STR);
$query->execute();
$results =  $query->fetch(PDO::FETCH_ASSOC);


$results['licensed_techs'] = implodeData($results, 'licensed_techs');
$results['compliance_phone_numbers'] = implodeData($results, 'compliance_phone_numbers');

function implodeData($data, $value){
    return ISSET($data[$value]) && $data[$value] != "" ? explode(',', $data[$value]) : null;
}

echo $db_connect->json_encode_v1($results);
