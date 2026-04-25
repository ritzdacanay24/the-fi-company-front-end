<?php
use EyefiDb\Databases\DatabaseQad;
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseQad();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_LOWER);

$db_connect_eyefi = new DatabaseEyefi();
$dbEyefi = $db_connect_eyefi->getConnection();
$dbEyefi->setAttribute(PDO::ATTR_CASE, PDO::CASE_LOWER);

$sql = "
    WITH full_bom(ps_par, ps_comp, final_item) AS
    (     
        SELECT ps_par
            , ps_comp
            , ps_par AS final_item
        FROM ps_mstr 
        UNION ALL
        SELECT d.ps_par
            , d.ps_comp
            , FB.final_item
        FROM full_bom FB
            Inner Join ps_mstr d 
                ON d.ps_par = FB.ps_comp 
    )

    SELECT ps_comp, ps_par
    FROM full_bom
    WHERE final_item = :ps_par
";

$stmt = $db->prepare($sql);
$stmt->bindParam(':part', $_GET['part'], PDO::PARAM_STR);
$details = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode($details);