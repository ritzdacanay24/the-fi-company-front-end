<?php
use EyefiDb\Databases\DatabaseQad;

$dbConnect = new DatabaseQad();
$db = $dbConnect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$mainQry = "
    select a.ld_part, a.ld_qty_oh,a.ld_status,a.ld_loc,a.ld_lot,a.ld_date,a.ld_ref,a.ld_rev
    , b.pt_desc1
    , b.pt_desc2
    , b.pt_um
    from ld_det a
    left join pt_mstr b on b.pt_part = a.ld_part and pt_domain = 'EYE'
    where a.ld_loc = :location and ld_domain = 'EYE'
    order by a.ld_part asc, a.ld_qty_oh asc
";
$query = $db->prepare($mainQry);
$query->bindParam(':location', $_GET['location'], PDO::PARAM_STR);
$query->execute();
$results =  $query->fetchAll(PDO::FETCH_ASSOC);

echo $dbConnect->json_encode($results);
