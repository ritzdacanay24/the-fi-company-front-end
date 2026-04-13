<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$mainQry = "
select case when title = 'Vendor' THEN first ELSE concat(first, ' ', last) END user
        , a.id
        , false checked
        , b.rate1 user_rate
        , a.title 
    FROM db.users a
    left JOIN db.user_rates b ON a.id = b.userId
    WHERE area = 'Field Service'
        AND active = 1 
        AND type = 0
        and a.id = :id
        AND ( access = 1 OR title = 'Vendor')
    ORDER BY case when title = 'Vendor' THEN first ELSE concat(first, ' ', last) END ASC
";
$query = $db->prepare($mainQry);
$query->bindParam(':id', $_GET['id'], PDO::PARAM_STR);
$query->execute();
$results =  $query->fetch(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
