<?php

class ShippingChanges
{

    protected $db;

    public function __construct($db, $dbQad)
    {
        $this->db = $db;
        $this->dbQad = $dbQad;
        $this->nowDate = date("Y-m-d");
        $this->nowDateTime = date("Y-m-d h:m:s", time());
    }

    public function eye01()
    {
        
        $qry = "
        select sum(CAST(case when turns < 1.0 THEN total ELSE 0 END AS DECIMAL(16,2) )) lessThanOne,
        sum(CAST(case when turns >= 1.0 THEN total ELSE 0 END AS DECIMAL(16,2) )) greaterThanOrEqualToOne,
        sum(CAST(total AS DECIMAL(16,2) )) total
            from (
                select 
                    onHandQty*sct_cst_tot total, 
                    CAST(case when onHandQty*sct_cst_tot > 0 THEN ((in_avg_iss*sct_cst_tot)/(onHandQty*sct_cst_tot))*365 ELSE 0 END AS DECIMAL(16,1)) turns
                    
            from pt_mstr a
            left join (
                    select in_part, 
                        avg(in_avg_iss) in_avg_iss
                    from in_mstr 
                    where in_domain = 'EYE' 
                    and in_site = 'EYE01'
                    group by in_part
                ) b ON b.in_part = a.pt_part 
                
                LEFT JOIN ( 
                    select sct_part 
                        , max(sct_cst_tot) sct_cst_tot 
                    from sct_det 
                    WHERE sct_sim = 'Standard' 
                        and sct_domain = 'EYE'
                    group by sct_part 
                ) d ON CAST(a.pt_part AS CHAR(25)) = d.sct_part  

                JOIN (
                    select a.ld_part
                        , sum(ld_qty_oh) onHandQty
                    from ld_det a 
                    where a.ld_domain = 'EYE' 
                    AND ld_site = 'EYE01'
                    and a.ld_qty_oh > 0
                    GROUP BY a.ld_part
                    
                ) c ON c.ld_part = a.pt_part

            where pt_domain = 'EYE' 
            AND  pt_prod_line != 15
           ) a
        ";
        //add item type -> Graphics
        $stmt = $this->dbQad->prepare($qry);
        $stmt->execute(); 	
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC); 	
        return $result;
    }

    public function jx01()
    {
        
        $qry = "
        select sum(CAST(case when turns < 1.0 THEN total ELSE 0 END AS DECIMAL(16,2) )) lessThanOne,
        sum(CAST(case when turns >= 1.0 THEN total ELSE 0 END AS DECIMAL(16,2) )) greaterThanOrEqualToOne,
        sum(CAST(total AS DECIMAL(16,2) )) total
            from (
                select 
                    onHandQty*sct_cst_tot total, 
                    CAST(case when onHandQty*sct_cst_tot > 0 THEN ((in_avg_iss*sct_cst_tot)/(onHandQty*sct_cst_tot))*365 ELSE 0 END AS DECIMAL(16,1)) turns
            from pt_mstr a
            left join (
                    select in_part, 
                        avg(in_avg_iss) in_avg_iss
                    from in_mstr 
                    where in_domain = 'EYE' 
					and in_site = 'JX'
                    group by in_part
                ) b ON b.in_part = a.pt_part 
                
                LEFT JOIN ( 
                    select sct_part 
                        , max(sct_cst_tot) sct_cst_tot 
                    from sct_det 
                    WHERE sct_sim = 'Standard' 
                        and sct_domain = 'EYE'
                    group by sct_part 
                ) d ON CAST(a.pt_part AS CHAR(25)) = d.sct_part  

                JOIN (
                    select a.ld_part
                        , sum(ld_qty_oh) onHandQty
                    from ld_det a 
                    where a.ld_domain = 'EYE' 
					AND ld_site = 'JX'
                    and a.ld_qty_oh > 0
                    GROUP BY a.ld_part
                    
                ) c ON c.ld_part = a.pt_part

            where pt_domain = 'EYE' 
            AND  pt_prod_line != 15
           ) a
        ";
        //add item type -> Graphics
        $stmt = $this->dbQad->prepare($qry);
        $stmt->execute(); 	
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC); 	
        return $result;
    }

    public function all()
    {
        
        $qry = "
        select sum(CAST(case when turns < 1.0 THEN total ELSE 0 END AS DECIMAL(16,2) )) lessThanOne,
        sum(CAST(case when turns >= 1.0 THEN total ELSE 0 END AS DECIMAL(16,2) )) greaterThanOrEqualToOne,
        sum(CAST(total AS DECIMAL(16,2) )) total
            from (
                select 
                    onHandQty*sct_cst_tot total, 
                    CAST(case when onHandQty*sct_cst_tot > 0 THEN ((in_avg_iss*sct_cst_tot)/(onHandQty*sct_cst_tot))*365 ELSE 0 END AS DECIMAL(16,1)) turns
            from pt_mstr a
            left join (
                    select in_part, 
                        avg(in_avg_iss) in_avg_iss
                    from in_mstr 
                    where in_domain = 'EYE' 
                    and in_site IN ('EYE01', 'JX')
                    group by in_part
                ) b ON b.in_part = a.pt_part 
                
                LEFT JOIN ( 
                    select sct_part 
                        , max(sct_cst_tot) sct_cst_tot 
                    from sct_det 
                    WHERE sct_sim = 'Standard' 
                        and sct_domain = 'EYE'
                    group by sct_part 
                ) d ON CAST(a.pt_part AS CHAR(25)) = d.sct_part  

                JOIN (
                    select a.ld_part
                        , sum(ld_qty_oh) onHandQty
                    from ld_det a 
                    where a.ld_domain = 'EYE' 
                    and ld_site IN ('EYE01', 'JX')
                    and a.ld_qty_oh > 0
                    GROUP BY a.ld_part
                    
                ) c ON c.ld_part = a.pt_part

            where pt_domain = 'EYE' 
            AND  pt_prod_line != 15
           ) a
        ";
        //add item type -> Graphics
        $stmt = $this->dbQad->prepare($qry);
        $stmt->execute(); 	
        $result = $stmt->fetch(PDO::FETCH_ASSOC); 	
        return $result;
    }

    
    public function fgLV()
    {
        
        $qry = "
           select sum(CAST(case when turns < 1.0 THEN total ELSE 0 END AS DECIMAL(16,2) )) lessThanOne,
           sum(CAST(case when turns >= 1.0 THEN total ELSE 0 END AS DECIMAL(16,2) )) greaterThanOrEqualToOne,
           sum(CAST(total AS DECIMAL(16,2) )) total
            from (
                select 
                    onHandQty*sct_cst_tot total, 
                    case when onHandQty*sct_cst_tot > 0 THEN ((in_avg_iss*sct_cst_tot)/(onHandQty*sct_cst_tot))*365 ELSE 0 END turns
            from pt_mstr a
            left join (
                    select in_part, 
                        avg(in_avg_iss) in_avg_iss
                    from in_mstr 
                    where in_domain = 'EYE' 
                    and in_site IN ('EYE01', 'JX')
                    group by in_part
                ) b ON b.in_part = a.pt_part 
                
                LEFT JOIN ( 
                    select sct_part 
                        , max(sct_cst_tot) sct_cst_tot 
                    from sct_det 
                    WHERE sct_sim = 'Standard' 
                        and sct_domain = 'EYE'
                    group by sct_part 
                ) d ON CAST(a.pt_part AS CHAR(25)) = d.sct_part  

                JOIN (
                    select a.ld_part
                        , sum(ld_qty_oh) onHandQty
                    from ld_det a 
                    JOIN ( 
						select loc_loc
						from loc_mstr 
						WHERE loc_domain = 'EYE'  and loc_type = 'FG'
						group by loc_loc 
					) cc ON cc.loc_loc = a.ld_loc 

                    where a.ld_domain = 'EYE' 
                    and a.ld_qty_oh > 0
                    GROUP BY a.ld_part
                    
                ) c ON c.ld_part = a.pt_part

            where pt_domain = 'EYE' 
            AND  pt_prod_line != 15
           ) a
        ";
        //add item type -> Graphics
        $stmt = $this->dbQad->prepare($qry);
        $stmt->execute(); 	
        $result = $stmt->fetch(PDO::FETCH_ASSOC); 	
        return $result;
    }

    public function totalInventory()
    {
        $mainQry = "
            select cast(SUM(a.ld_qty_oh*c.sct_cst_tot) as numeric(36,2)) sum_count,
            cast(sum(case when c.loc_type = 'FG' THEN a.ld_qty_oh*c.sct_cst_tot ELSE 0 END) as numeric(36,2)) fg_sum
            FROM ld_det a 
            LEFT JOIN pt_mstr b ON a.ld_part = b.pt_part AND b.pt_domain = 'EYE' 
            
            LEFT JOIN loc_mstr c ON c.loc_loc = a.ld_loc 
                    AND c.loc_type = 'FG' 
                    AND loc_domain = 'EYE'
    
            LEFT JOIN ( 
                select sct_part
                    , max(sct_cst_tot) sct_cst_tot
                from sct_det
                WHERE sct_sim = 'Standard' 
                    and sct_domain = 'EYE' 
                group by sct_part
            ) c ON b.pt_part = c.sct_part
            
            WHERE ld_domain = 'EYE' 
                and a.ld_qty_oh > 0
                AND (
                    RIGHT(b.pt_part, 1) != 'U' AND RIGHT(b.pt_part, 1) != 'R' AND RIGHT(b.pt_part, 1) != 'N' 
                ) 
                
        ";
        $query = $this->dbQad->prepare($mainQry);
        $query->execute();
        return $query->fetch(PDO::FETCH_ASSOC);
    }

}



use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Databases\DatabaseQad;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();

$data = new ShippingChanges($db, $dbQad);

echo $db_connect->jsonToDebug(array(
    "eye01" => $data->eye01(),
    "jx01" => $data->jx01(),
    "all" => $data->all(),
    "fgLV" => $data->fgLV(),
    "totalInventory" => $data->totalInventory(),
));