<?php

class WipReport
{

    protected $db;
    public $partNumber;
    public $itemSearchQuery;

    public function __construct($db)
    {
        $this->db = $db;
        $this->nowDate = date("Y-m-d");
    }

    ##  case when wo_qty_comp = 0 THEN a.total_amount-total_open_amount ELSE a.total_amount-total_open_amount END wo_wip_tot
    public function getData()
    {
        
        $mainQry = "
            select wo_nbr id
            , wo_nbr
            , wo_wip_tot wo_wip_tot
            , wo_so_job
            , wo_routing
            , wo_rel_date
            , wo_qty_ord
            , wo_qty_comp
            , wo_need_date
            , wo_line
            , wo_due_date
            , wo_part
            , wo_status
            from wo_mstr  
            left join ( 
                select 
                    sum(wod_qty_req - wod_qty_iss) open_qty,  
                    sum((wod_qty_req) * wod_bom_amt) total_amount,
                    sum(((wod_qty_req-wod_qty_iss) * wod_bom_amt)-wod_mvrte_accr) total_open_amount,
                    wod_nbr,
                    sum(wod_qty_iss) wod_qty_iss
               from wod_det  
               where wod_domain = 'EYE'   
               
               group by wod_nbr    
            ) a ON a.wod_nbr = wo_mstr.wo_nbr
            
            where wo_domain = 'EYE'  
            
            and wo_wip_tot > 0
            order by wo_due_date DESC
        ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $results = $query->fetchAll(PDO::FETCH_ASSOC);

        foreach($results as &$row){
            $row['id'] = $row['wo_nbr'];
        }

        return $results;
    }

    public function __destruct()
    {
        $this->db = null;
    }
}
