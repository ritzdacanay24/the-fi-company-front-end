<?php

namespace EyefiDb\Api\WorkOrderRequest;
use PDO; 


class WorkOrderRequest
{

	protected $db;

	public function __construct($dbQad)
	{

		$this->db = $dbQad;
	}

	public function getAll()
	{

		$qry = "
				select * 
				from work_order_request
			";

		$query = $this->db->prepare($qry);
		$query->execute();
		return $query->fetchAll(PDO::FETCH_ASSOC);
	}

}
