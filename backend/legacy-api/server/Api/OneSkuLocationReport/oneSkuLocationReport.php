<?php
use EyefiDb\Databases\DatabaseQad;

$db_connect = new DatabaseQad();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_LOWER);

$mainQry = "
    select CAST(a.ld_part AS CHAR(25)) ld_part
        , a.ld_date ld_date
        , a.ld_status ld_status
        , a.ld_loc ld_loc
        , cast(a.ld_qty_oh as numeric(36,2)) ld_qty_oh
        , cast(a.ld_qty_all as numeric(36,2)) ld_qty_all
        , b.pt_desc1 || ' ' || b.pt_desc2 fullDesc
        , cast(d.sct_cst_tot*a.ld_qty_oh as numeric(36,2)) extcost
        , cast(d.sct_cst_tot as numeric(36,2)) sct_cst_tot
        , total_items_in_location
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
        select COUNT(ld_part) total_items_in_location, ld_loc
        from ld_det 
        where ld_domain = 'EYE'
        group by ld_loc
    ) e ON e.ld_loc = a.ld_loc
    
    where a.ld_domain = 'EYE'
        AND a.ld_qty_oh > 0 and total_items_in_location > 1
    ORDER BY CAST(a.ld_loc AS CHAR(25)) ASC
    with (noLock)
";
$query = $db->prepare($mainQry);
$query->execute();
$results =  $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
