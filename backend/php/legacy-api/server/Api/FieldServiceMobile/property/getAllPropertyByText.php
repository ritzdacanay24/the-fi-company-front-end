<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$mainQry = "
    SELECT a.*, b.fs_property_det_id, b.hits, CONCAT_WS(', ', 
        NULLIF(trim(a.property), ''),
        NULLIF(trim(a.address1), ' '),
        NULLIF(trim(a.city), ' '), 
        NULLIF(trim(a.state), ' '), 
        NULLIF(trim(a.zip_code), ' '), 
        NULLIF(trim(a.property_phone), ' ')) full_address,
        case when COALESCE(a.property, '') = '' ||  COALESCE(a.address1, '') = '' || COALESCE(a.city, '') = '' || COALESCE(a.state, '') = '' || COALESCE(a.zip_code, '') = '' THEN 'No' ELSE 'Yes' END address_complete
    FROM fs_property_det a 
    left join (
        select fs_property_det_id, count(*) hits
        from fs_property_ref 
        group by fs_property_det_id
    ) b ON b.fs_property_det_id = a.id
    WHERE CONCAT_WS(', ', 
    NULLIF(trim(a.property), ''),
    NULLIF(trim(a.address1), ' '),
    NULLIF(trim(a.city), ' '), 
    NULLIF(trim(a.state), ' '), 
    NULLIF(trim(a.zip_code), ' '), 
    NULLIF(trim(a.property_phone), ' ')) LIKE ?
    AND ( a.property IS NOT NULL AND a.property != '')
    AND a.active = 1
";

$t = $_GET['text'];

$params = array("%$t%");

$query = $db->prepare($mainQry);
$query->execute($params);
$results = $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
