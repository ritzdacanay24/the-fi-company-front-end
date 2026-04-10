<?php
use EyefiDb\Databases\DatabaseQad;

$db_connect = new DatabaseQad();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_LOWER);

$mainQry = "
    select CAST(a.ld_part AS CHAR(25)) ld_part
        , a.ld_loc ld_loc
        , sum(cast(a.ld_qty_oh as numeric(36,2))) ld_qty_oh
        , sum(cast(a.ld_qty_all as numeric(36,2))) ld_qty_all
        , sum(cast(d.sct_cst_tot*a.ld_qty_oh as numeric(36,2))) extcost
        , sum(cast(d.sct_cst_tot as numeric(36,2))) sct_cst_tot
        , sum(total_items_in_location) total_items_in_location
    from ld_det a
    
    LEFT JOIN ( 
        select pt_part
            , max(pt_desc1) pt_desc1
            , max(pt_desc2) pt_desc2
        from pt_mstr
        WHERE pt_domain = 'EYE'
        group by pt_part
    ) b ON b.pt_part = CAST(a.ld_loc AS CHAR(25))
    
    LEFT JOIN ( 
        select sct_part
            , max(sct_cst_tot) sct_cst_tot
        from sct_det
        WHERE sct_sim = 'Standard' 
            and sct_domain = 'EYE'
            and sct_site  = 'EYE01'
        group by sct_part
    ) d ON CAST(a.ld_part AS CHAR(25)) = d.sct_part 

    left join (
        select COUNT(ld_loc) total_items_in_location, ld_part
        from ld_det 
        where ld_domain = 'EYE'
        group by ld_part
    ) e ON e.ld_part = a.ld_part
    
    where a.ld_domain = 'EYE'
        AND a.ld_qty_oh > 0 and total_items_in_location > 1
        group by CAST(a.ld_part AS CHAR(25))
        , a.ld_loc
    ORDER BY CAST(a.ld_loc AS CHAR(25)) ASC
    with (noLock)
";
$query = $db->prepare($mainQry);
$query->execute();
$results =  $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
