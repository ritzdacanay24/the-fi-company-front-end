<?php

class InventoryByProdLine
{

    protected $db;

    public function __construct($db)
    {

        $this->db = $db;
    }

    public function getInventoryByProdLine()
    {

        $mainQry = "
            select max(pl_prod_line) PT_PROD_LINE
                , pl_desc pl_desc
            FROM pl_mstr a 
            WHERE pl_domain = 'EYE' 
                AND pl_prod_line != ''
                group by pl_desc
        ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $prodLineDetails = $query->fetchAll(PDO::FETCH_ASSOC);

        $mainQry = "
                select cast(SUM(a.ld_qty_oh*c.sct_cst_tot) as numeric(36,2)) sumCount  
                    , b.pt_prod_line pt_prod_line
                FROM ld_det a 
                LEFT JOIN pt_mstr b ON a.ld_part = b.pt_part AND b.pt_domain = 'EYE' 
                
                LEFT JOIN ( 
                    select sct_part
                        , max(sct_cst_tot) sct_cst_tot
                    from sct_det
                    WHERE sct_sim = 'Standard' 
                        and sct_domain = 'EYE' 
                        and sct_site  = 'EYE01'
                    group by sct_part
                ) c ON b.pt_part = c.sct_part
                
                WHERE ld_domain = 'EYE' 
                    and a.ld_qty_oh > 0
                    and case when (
                        RIGHT(b.pt_part, 1) != 'U' AND RIGHT(b.pt_part, 1) != 'R' AND RIGHT(b.pt_part, 1) != 'N' 
                    ) THEN '-' ELSE 'COI' END <> 'COI'
                GROUP BY b.pt_prod_line
            ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $obj = $query->fetchAll(PDO::FETCH_ASSOC);

        $o = array();
        $o['inventorySum'] = 0;
        $rrorMessage = array();
        if ($prodLineDetails) {
            foreach ($prodLineDetails as $row) {
                if ($obj) {
                    foreach ($obj as $row1) {
                        if ($row['PT_PROD_LINE'] == $row1['PT_PROD_LINE']) {
                            $o['inventorySum'] += $row1['SUMCOUNT'];
                            $o['label'][] = $row['PL_DESC'];
                            $o['value'][] = $row1['SUMCOUNT'];
                        }
                    }
                }
            }
        } else {
            array_push($rrorMessage, 'ProdLine Not Found');
        }

        if ($rrorMessage) {
            return $rrorMessage;
        }

        $mainQry = "
                select cast(sum(a.ld_qty_oh) as numeric(36,2)) qtyOh
                    , SUM(a.ld_qty_oh*c.sct_cst_tot) totalValue
                    , ld_part 
                    , max(b.pt_article) pt_article
                    , max(b.pt_prod_line) pt_prod_line
                    , max(d.pl_desc) pl_desc
                    , max(b.pt_desc1) || ' ' || max(b.pt_desc2) fullDesc
                FROM ld_det a 
                LEFT JOIN pt_mstr b ON a.ld_part = b.pt_part AND b.pt_domain = 'EYE' 
                
                LEFT JOIN (
                    select pl_prod_line
                        , pl_desc
                    FROM pl_mstr a 
                    WHERE pl_domain = 'EYE' 
                        AND pl_prod_line != ''
                ) d ON d.pl_prod_line = b.pt_prod_line

                LEFT JOIN ( 
                    select sct_part
                        , max(sct_cst_tot) sct_cst_tot
                    from sct_det
                    WHERE sct_sim = 'Standard' 
                        and sct_domain = 'EYE' 
                        and sct_site  = 'EYE01'
                    group by sct_part
                ) c ON b.pt_part = c.sct_part
                
                WHERE ld_domain = 'EYE'
                    and a.ld_qty_oh > 0
                    and case when (
                        RIGHT(b.pt_part, 1) != 'U' AND RIGHT(b.pt_part, 1) != 'R' AND RIGHT(b.pt_part, 1) != 'N' 
                    ) THEN '-' ELSE 'COI' END <> 'COI'
                GROUP BY ld_part
                ORDER BY sum(a.ld_qty_oh*c.sct_cst_tot) DESC
            ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $o['details'] = $query->fetchAll(PDO::FETCH_ASSOC);

        return $o;
    }

    public function lasVegasRawMaterial(){
        $qry = "

            select cast(sum(a.ld_qty_oh) as numeric(36,2)) qtyOh
                , SUM(a.ld_qty_oh*c.sct_cst_tot) totalValue
                , ld_part 
                , max(b.pt_article) pt_article
                , max(b.pt_prod_line) pt_prod_line
                , max(d.pl_desc) pl_desc
                , max(b.pt_desc1) || ' ' || max(b.pt_desc2) fullDesc
                , max(IFNULL(open_wo_qty,0)) open_wo_qty
            FROM ld_det a 
            LEFT JOIN pt_mstr b ON a.ld_part = b.pt_part AND b.pt_domain = 'EYE' 

            LEFT JOIN (
                select pl_prod_line
                    , pl_desc
                FROM pl_mstr a 
                WHERE pl_domain = 'EYE'
            ) d ON d.pl_prod_line = b.pt_prod_line

            LEFT JOIN ( 
                select sct_part
                    , max(sct_cst_tot) sct_cst_tot
                from sct_det
                WHERE sct_sim = 'Standard' 
                    and sct_domain = 'EYE' 
                    and sct_site  = 'EYE01'
                group by sct_part
            ) c ON b.pt_part = c.sct_part

            
            JOIN ( 
                select loc_loc, max(loc_type) loc_type
                from loc_mstr 
                WHERE loc_domain = 'EYE'  
                and loc_type NOT IN ('FG', 'SS')
                group by loc_loc 
            ) cc ON cc.loc_loc = a.ld_loc  

            left join (
                select wo_part, sum(wo_qty_ord - wo_qty_comp) open_wo_qty
                from wo_mstr
                where wo_domain = 'EYE'
                AND wo_status = 'R'
                group by wo_part
            ) d ON d.wo_part = a.ld_part

            
            WHERE ld_domain = 'EYE'
                and a.ld_qty_oh > 0
                AND ld_site = 'EYE01'
                and case when (
                    RIGHT(b.pt_part, 1) != 'U' AND RIGHT(b.pt_part, 1) != 'R' AND RIGHT(b.pt_part, 1) != 'N' 
                ) THEN '-' ELSE 'COI' END !=  'COI'
            GROUP BY ld_part
            ORDER BY sum(a.ld_qty_oh*c.sct_cst_tot) DESC

        ";

        $query = $this->db->prepare($qry);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getSafetyStock(){
        $qry = "
        select *
         from (
             select a.pt_desc1
             , onHandQty*sct_cst_tot total
             , a.pt_desc2
             , a.pt_part
             , a.pt_part_type
             , c.onHandQty
             , d.sct_cst_tot
             , c.loc_type
             , case when (
                RIGHT(a.pt_part, 1) != 'U' AND RIGHT(a.pt_part, 1) != 'R' AND RIGHT(a.pt_part, 1) != 'N' 
            ) THEN '-' ELSE 'COI' END is_coi
         from pt_mstr a
             LEFT JOIN ( 
                 select sct_part 
                     , max(sct_cst_tot) sct_cst_tot 
                 from sct_det 
                 WHERE sct_sim = 'Standard' 
                     and sct_domain = 'EYE'
                     and sct_site  = 'EYE01'
                 group by sct_part 
             ) d ON CAST(a.pt_part AS CHAR(25)) = d.sct_part  
             JOIN (
                 select a.ld_part
                     , sum(ld_qty_oh) onHandQty
                     , loc_type
                 from ld_det a 
                 JOIN ( 
                     select loc_loc, loc_type
                     from loc_mstr 
                     WHERE loc_domain = 'EYE' and loc_type = 'SS'
                     group by loc_loc, loc_type
                 ) cc ON cc.loc_loc = a.ld_loc 
                 where a.ld_domain = 'EYE' 
                 and a.ld_qty_oh > 0
                 GROUP BY a.ld_part, loc_type   
             ) c ON c.ld_part = a.pt_part
         where pt_domain = 'EYE'  
        ) a
        WHERE is_coi <> 'COI'
     ";
     //add item type -> Graphics
     $stmt = $this->db->prepare($qry);
     $stmt->execute(); 	
     $result = $stmt->fetchAll(PDO::FETCH_ASSOC); 	
     return $result;
    }

    public function __destruct()
    {

        $this->db = null;
    }
}
