<?php

namespace EyefiDb\Api\work_order_view;
use PDO; 
use PDOException;	

class WorkOrderInfo
{

	protected $db;

	public function __construct($dbQad)
	{

		$this->db = $dbQad;
	}

	public function read($pickNumber)
	{

		$qry = "
				select a.wod_nbr
					, a.wod_lot
					, a.wod_iss_date
					, a.wod_part
					, a.wod_qty_req wod_qty_req
					, a.wod_qty_pick wod_qty_pick
					, a.wod_qty_iss wod_qty_iss
					, a.wod_qty_all wod_qty_all
					, a.wod_qty_req-a.wod_qty_iss qty_open
					, a.wod_nbr
					, CONCAT(c.pt_desc1,c.pt_desc2) pt_desc1
					, c.pt_um
					, c.pt_part_type
					, d.totalAvail
					, d.totalOnHand
					, a.wod_qty_req - (a.wod_qty_pick+a.wod_qty_iss) short
					, CASE 
						WHEN a.wod_qty_req = 0
							THEN 0
						ELSE  (a.wod_qty_iss/NULLIF(a.wod_qty_req, 0))*100
					END lineStatus
					, CASE 
						WHEN a.wod_qty_req = 0
							THEN 'text-success'
						WHEN (a.wod_qty_iss/NULLIF(a.wod_qty_req,0))*100 = '100'
							THEN 'text-success'
					END lineStatusClass
					, wod_op
					, wod_bom_qty wod_bom_qty
					, c.pt_rev
				from wod_det a  
				LEFT JOIN pt_mstr c 
					ON c.pt_part = a.wod_part
						AND pt_domain = 'EYE'
				LEFT JOIN (
					select b.in_part  
						, sum(b.in_qty_avail) totalAvail 
						, sum(b.in_qty_all) totalAll 
						, sum(b.in_qty_oh) totalOnHand
					from in_mstr b  
					WHERE b.in_domain = 'EYE'
					GROUP BY b.in_part
				) d ON d.in_part = a.wod_part
				
				WHERE LTRIM(RTRIM(a.wod_nbr)) = :pickNumber
					AND wod_domain = 'EYE'			
                ORDER BY a.wod_nbr ASC 
                WITH (nolock)
				
			";

		$query = $this->db->prepare($qry);
		$query->bindParam(":pickNumber", $pickNumber, PDO::PARAM_INT);
		$query->execute();
		$result = $query->fetchAll(PDO::FETCH_ASSOC);

		$qry = "
				select a.wo_so_job
					, a.wo_nbr
					, a.wo_lot
					, a.wo_ord_date
					, a.wo_due_date
					, a.wo_part
					, a.wo_qty_ord
					, CONCAT(c.pt_desc1,c.pt_desc2) pt_desc1
					, a.wo_order_sheet_printed
					, a.wo_status
					, a.wo_rmks	
					, CASE WHEN a.wo_so_job = 'dropin' THEN 1 ELSE 0 END dropInClass
				from wo_mstr a 
				LEFT JOIN pt_mstr c 
					ON c.pt_part = a.wo_part
						AND pt_domain = 'EYE'
				where a.wo_domain = 'EYE' 
					AND LTRIM(RTRIM(a.wo_nbr)) = :wo_nbr
				WITH (nolock)
			";
		$query = $this->db->prepare($qry);
		$query->bindParam(":wo_nbr", $pickNumber, PDO::PARAM_STR);
		$query->execute();
		$mainDetails = $query->fetch();

		$obj = array(
			"details" => $result, "mainDetails" => $mainDetails
		);

		return $obj;
	}
}
