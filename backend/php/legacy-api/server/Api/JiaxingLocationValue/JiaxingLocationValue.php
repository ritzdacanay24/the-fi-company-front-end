<?php

class JiaxingLocationValue
{

    protected $db;
    public $partNumber;
    public $itemSearchQuery;

    public function __construct($db)
    {
        $this->db = $db;
        $this->nowDate = date("Y-m-d");
    }

    public function getData($name)
    {
        $qry = "
            select a.ld_part, 
                c.last_receipt, 
                a.ld_lot, 
                a.ld_qty_oh, 
                b.pt_desc2, 
                d.sct_cst_tot, 
                a.ld_qty_oh*d.sct_cst_tot ext_cost,
                CONCAT(b.pt_desc1, b.pt_desc2) pt_desc1,
                pt_vend pt_vend
            from ld_det a

            join (
                select pt_part, 
                    max(pt_desc1) pt_desc1, 
                    max(pt_desc2) pt_desc2,
                    max(pt_vend) pt_vend
                from pt_mstr a
                where pt_domain = 'EYE' AND (
					RIGHT(a.pt_part, 1) != 'U' AND RIGHT(a.pt_part, 1) != 'R' AND RIGHT(a.pt_part, 1) != 'N' 
				)   
                group by pt_part
            ) b ON b.pt_part = a.ld_part 
            
            left join (
                select tr_part, 
                    max(tr_effdate) last_receipt 
                from tr_hist   
                where tr_type IN ('RCT-PO', 'RCT-UNP', 'RCT-WO') 
                    and tr_domain = 'EYE'  
                group by tr_part 
            ) c ON c.tr_part = a.ld_part 
            
            LEFT JOIN ( 
                select sct_part 
                    , max(sct_cst_tot) sct_cst_tot 
                from sct_det 
                WHERE sct_sim = 'Standard' 
                    and sct_domain = 'EYE'  
                group by sct_part 
            ) d ON CAST(a.ld_part AS CHAR(25)) = d.sct_part  

            
            LEFT JOIN ( 
                select loc_loc, max(loc_type) loc_type
                from loc_mstr 
                WHERE loc_domain = 'EYE'  
                group by loc_loc 
            ) cc ON cc.loc_loc = a.ld_loc   
                    
        ";

        
        if($name == "FG"){
            $qry .= " where cc.loc_type = :location ";
        }else{
            $qry .= " where a.ld_loc = :location ";
        }

        $qry .= " AND ld_domain = 'EYE' ORDER BY a.ld_qty_oh*d.sct_cst_tot DESC   ";
        

        $query = $this->db->prepare($qry);
        $query->bindParam(':location', $name, PDO::PARAM_STR);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function __destruct()
    {
        $this->db = null;
    }
}
