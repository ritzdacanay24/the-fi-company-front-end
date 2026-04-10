<?php
use EyefiDb\Databases\DatabaseQad;

$db_connect = new DatabaseQad();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_LOWER);

$t = $_GET['text'];
$matchCase = ISSET($_GET['matchCase']) ? $_GET['matchCase'] : "false";

$mainQry = "
    SELECT a.pt_part
        , a.pt_desc1 || '-' || a.pt_desc2 description 
        , a.pt_status
        , qty_on_hand
        , total_available
        , cast(sct_cst_tot as numeric(36,2)) sct_cst_tot
    FROM pt_mstr a

    LEFT JOIN (
        select sum(cast(in_qty_oh as numeric(36,2))) qty_on_hand  
            , sum(cast(in_qty_All as numeric(36,2))) total_available  
            , in_part
        from in_mstr
        group by in_part
    ) b ON b.in_part = a.pt_part

    left join (
        select upper(sct_part) sct_part
            , max(sct_cst_tot) sct_cst_tot
        from sct_det
        WHERE sct_sim = 'Standard' 
            and sct_domain = 'EYE' 
            and sct_site  = 'EYE01'
        group by upper(sct_part)
    ) sct ON sct.sct_part = a.pt_part
    
";

if($matchCase == "true"){
    $mainQry .= "WHERE a.pt_part = ? ";
    $params = array("$t");
}else{
    $mainQry .= "WHERE a.pt_part LIKE ? OR a.pt_desc1 || '-' || a.pt_desc2 LIKE ? ";
    $params = array("%$t%", "%$t%");
 
}

$mainQry .= " AND a.pt_domain = 'EYE' ";

$query = $db->prepare($mainQry);
$query->execute($params);
$results =  $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
