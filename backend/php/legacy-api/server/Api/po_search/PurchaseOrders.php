<?php

namespace EyefiDb\Api\po_search;
use PDO; 
use PDOException;	

class PurchaseOrders
{

	protected $db;

	public function __construct($dbQad)
	{
		$this->db = $dbQad;
	}

	public function readItemDetailsPo($item)
	{
		$qry = "
				select a.pod_nbr
					, a.pod_part
					, pod_qty_ord
					, pod_qty_rcvd
					, pod_due_date
					, pod_pur_cost
					, pod_um
					, pod_status
					, b.po_vend
					, b.po_shipvia
					, b.po_ord_date
				from pod_det a
				left join po_mstr b ON a.pod_nbr = b.po_nbr AND po_domain = 'EYE'
				where a.pod_domain = 'EYE'
					AND a.pod_part = :item
					AND a.pod_status != 'c'
					AND year(pod_due_date) >= '2019'
				WITH (NOLOCK)
			";
		$query = $this->db->prepare($qry);
		$query->bindParam(":item", $item, PDO::PARAM_STR);
		$query->execute();
		$POresults = $query->fetchAll(PDO::FETCH_ASSOC);

		return $POresults;
	}

	public function byPO($po)
	{
		$qry = "
				select a.pod_nbr
					, a.pod_part
					, pod_qty_ord
					, pod_qty_rcvd
					, pod_due_date
					, pod_pur_cost
					, pod_um
					, pod_status
					, b.po_vend
					, b.po_shipvia
					, b.po_ord_date
				from pod_det a
				left join po_mstr b ON a.pod_nbr = b.po_nbr AND po_domain = 'EYE'
				where a.pod_domain = 'EYE'
					AND a.pod_nbr = :po
					AND a.pod_status != 'c'
					AND year(pod_due_date) >= '2019'
				WITH (NOLOCK)
			";
		$query = $this->db->prepare($qry);
		$query->bindParam(":po", $po, PDO::PARAM_STR);
		$query->execute();
		$POresults = $query->fetchAll(PDO::FETCH_ASSOC);

		return $POresults;
	}

}

