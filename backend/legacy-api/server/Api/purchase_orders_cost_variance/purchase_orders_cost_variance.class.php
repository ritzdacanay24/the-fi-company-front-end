<?php

class PoCostVariance
{

    protected $db;

    public function __construct($dbQad)
    {

        $this->db = $dbQad;
    }

    public function readAll()
    {
        $obj = array();
        $mainQry = "
				select a.pod_nbr
					, a.pod_due_date
					, a.pod_line
					, a.pod_part
					, a.pod_pur_cost
					, b.sct_cst_tot pt_price
					, a.pod_pur_cost-b.sct_cst_tot priceDiff
					, pod_qty_ord
					, pod_qty_rcvd
					, c.po_vend 
				from pod_det a
				
				LEFT JOIN ( 
					select sct_part
						, max(sct_cst_tot) sct_cst_tot
					from sct_det
					WHERE sct_sim = 'Standard' 
						and sct_domain = 'EYE' 
						and sct_site  = 'EYE01'
					group by sct_part
				) b ON a.pod_part = b.sct_part 
				
				left join (
					SELECT po_nbr
						, max(po_vend) po_vend
					FROM po_mstr
					GROUP BY po_nbr
				) c ON c.po_nbr = a.pod_nbr
				WHERE pod_status != 'c'
				AND pod_domain = 'EYE'
				AND a.pod_pur_cost != b.sct_cst_tot
				ORDER BY a.pod_pur_cost DESC
				WITH (NOLOCK)
			";

        $query = $this->db->prepare($mainQry);
        $query->execute();
        $result = $query->fetchAll(PDO::FETCH_ASSOC);

        return $result;
    }
}
