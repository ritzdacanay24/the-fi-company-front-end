<?php

namespace EyefiDb\Api\work_order_search;

use PDO;
use PDOException;

class WorkOrder
{

	protected $db;
	public $nowDate;

	public function __construct($dbQad, $db)
	{

		$this->db = $dbQad;
		$this->db1 = $db;
	}

	public function getCustomerOrderNumbers($order)
	{
		$mainQry = "
			SELECT sod_nbr
				, sod_order_category
				, sod_custpart
				, sod_due_date
				, sod_part
				, a.*
			FROM sod_det 
			LEFT JOIN (
				select a.so_nbr
					, a.so_cust
					, a.so_ship
					, a.so_ord_date
					, a.so_req_date
					, a.so_due_date
					, a.so_shipvia
					, a.so_inv_date
					, a.so_ship_date
					, a.so_po
				from so_mstr a
				where so_domain = 'EYE'
			) a ON a.so_nbr = sod_det.sod_nbr
			WHERE sod_domain = 'EYE'
				AND sod_order_category = :co
			WITH (NOLOCK)
		";
		$query = $this->db->prepare($mainQry);
		$query->bindParam(':co', $order, PDO::PARAM_STR);
		$query->execute();
		$results = $query->fetchAll(PDO::FETCH_ASSOC);
		
		return $results;
    }

	public function Read($order)
	{

		$obj = array();

		$mainQry = "
			select * 
			from wo_mstr 
			where wo_nbr = :wo_nbr
				AND wo_domain = 'EYE'
			WITH (NOLOCK)
		";

		$query = $this->db->prepare($mainQry);
		$query->bindParam(':wo_nbr', $order, PDO::PARAM_STR);
		$query->execute();
		$main = $query->fetch();
		
		$orderFound = true;
		if (!$main) {
			$orderFound = false;
		}

		$order = $main['wo_nbr'];

		$mainQry = "
			select * 
			from wod_det 
			where wod_nbr = :wo_nbr
				AND wod_domain = 'EYE'
			WITH (NOLOCK)
		";

		$query = $this->db->prepare($mainQry);
		$query->bindParam(':wo_nbr', $order, PDO::PARAM_STR);
		$query->execute();
		$details = $query->fetchAll();

		$mainQry = "
			select * 
			from wr_route 
			where wr_nbr = :wo_nbr
				AND wr_domain = 'EYE'
			WITH (NOLOCK)
		";

		$query = $this->db->prepare($mainQry);
		$query->bindParam(':wo_nbr', $order, PDO::PARAM_STR);
		$query->execute();
		$routing = $query->fetchAll();


		$obj = array(
			"main" => $main,
			"details" => $details,
			"routing" => $routing,
			"orderFound" => $orderFound,
		);

		return $obj;
	}

	public function getTransactions($order)
	{		
		$mainQry = "
				select tr_ship_id
					, tr_part
					, tr_date
					, tr_type
					, tr_last_date
					, tr_nbr
					, tr_addr
					, tr_rmks
					, tr_qty_loc
					, tr_userid
					, tr_type
					, tr_per_date
					, tr_last_date
					, tr_time
					, tr_qty_req
					, tr_qty_chg
				from tr_hist 
				where tr_so_job = :so_nbr 
				and tr_domain = 'EYE' 
				with (noLock)
			";

		$query = $this->db->prepare($mainQry);
		$query->bindParam(':so_nbr', $order, PDO::PARAM_STR);
		$query->execute();
		return $query->fetchAll(PDO::FETCH_ASSOC);

	}
}
