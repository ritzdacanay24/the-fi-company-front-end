<?php

namespace EyefiDb\Api\drop_locations;

class DropLocations
{

    protected $dbQad;
    public $domain;

    public function __construct($dbQad)
    {

        $this->dbQad = $dbQad;
    }

    public function getDropLocations()
    {

        $qry = "
            select a.ld_loc ld_loc
                , a.ld_part ld_qty_oh
                , a.ld_qty_oh ld_qty_oh
                , a.ld_site ld_site
                , a.ld_status ld_status
                , a.ld_qty_all ld_qty_all
                , CONCAT(pt_desc1, pt_desc2) fullDesc
                , a.ld_part
            from ld_det a
            
            LEFT JOIN ( 
                select pt_part
                    , max(pt_desc1) pt_desc1
                    , max(pt_desc2) pt_desc2
                from pt_mstr
                WHERE pt_domain = '".$this->domain."'
                group by pt_part
            ) b ON b.pt_part = a.ld_part
            
            WHERE ld_domain = '".$this->domain."'
                AND a.ld_loc IN ('LV200', 'LV300', 'GPHSTOCK', 'GPHTHK01', 'LVFG', 'SHPSTG', 'COIPTWY', 'STAGE1', 'STAGE2')
                AND 
            WITH (NOLOCK)
        ";

        $qry = "
            select a.ld_loc ld_loc
                , a.ld_qty_oh ld_qty_oh
                , a.ld_site ld_site
                , a.ld_status ld_status
                , a.ld_qty_all ld_qty_all
                , CONCAT(pt_desc1, pt_desc2) fullDesc
                , a.ld_part ld_part
                , d.tr_date tr_date
                , d.tr_time tr_time
                , b.standardCost
                , b.standardCost * a.ld_qty_oh extended
            from ld_det a
            
            LEFT JOIN ( 
                select a.pt_part
                    , max(a.pt_desc1) pt_desc1
                    , max(a.pt_desc2) pt_desc2
                    , max(b.sct_cst_tot) standardCost
                from pt_mstr a
                left join sct_det b ON a.pt_part = b.sct_part
                and sct_site  = 'EYE01' AND sct_sim = 'Standard' and sct_domain = '".$this->domain."'  
                WHERE a.pt_domain = '".$this->domain."'
                group by a.pt_part
            ) b ON b.pt_part = a.ld_part

            LEFT JOIN (
                select max(tr_trnbr) tr_trnbr
                    , tr_part 
                from tr_hist 
                WHERE tr_domain = '".$this->domain."'
                AND tr_ref_site = 'eye01'
                AND tr_loc IN ('LV200', 'LV300', 'GPHSTOCK', 'GPHTHK01', 'LVFG', 'SHPSTG', 'COIPTWY', 'STAGE1', 'STAGE2')
                GROUP BY tr_part
            ) c ON c.tr_part = a.ld_part
            
            LEFT JOIN (
                select  tr_trnbr
                    ,  tr_date 
                    ,  tr_time 
                from tr_hist 
                WHERE tr_domain = '".$this->domain."'
                AND tr_ref_site = 'eye01'
                AND tr_loc IN ('LV200', 'LV300', 'GPHSTOCK', 'GPHTHK01', 'LVFG', 'SHPSTG', 'COIPTWY', 'STAGE1', 'STAGE2')
               
            ) d ON c.tr_trnbr = d.tr_trnbr
            
            WHERE ld_domain = '".$this->domain."'
                AND a.ld_loc IN ('LV200', 'LV300', 'GPHSTOCK', 'GPHTHK01', 'LVFG', 'SHPSTG', 'COIPTWY', 'STAGE1', 'STAGE2')
                AND a.ld_qty_oh != 0
            WITH (NOLOCK)
        ";
        $query = $this->dbQad->prepare($qry);
        $query->execute();
        return $query;
    }
}
