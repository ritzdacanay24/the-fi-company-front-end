<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$mainQry = "
select  address1
, address2
, city
, state
, zip_code
, CONCAT_WS(', ', 
    NULLIF(address1, ''),
    NULLIF(address2, ''),
    NULLIF(city, ''), 
    NULLIF(state, ''), 
    NULLIF(zip_code, '')
) AS full_address, 
id,
lat, lon
from fs_property_det 
where lat IS NOT NULL and lon IS NOT NULL
";

$query = $db->prepare($mainQry);
$query->execute();
$results =  $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);


