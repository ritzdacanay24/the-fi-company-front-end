<?php

namespace EyefiDb\Api\work_order_routing;
use PDO; 
use PDOException;	

class WorkOrderRouting
{

	protected $db;
	public $nowDate;
	public $todayDate;

	public function __construct($dbQad, $db)
	{

		$this->db = $dbQad;
		$this->db1 = $db;
	}

	public function ReadSingle($part)
	{
		$obj = array();

		//details 
		$mainQry = "
			
				SELECT a.wr_nbr wr_nbr
					, a.wr_op wr_op
					, a.wr_desc wr_desc
					, a.wr_wkctr wr_wkctr
					, a.wr_qty_ord wr_qty_ord
					, a.wr_qty_comp wr_qty_comp
					, a.wr_due wr_due
					, a.wr_part wr_part
					, a.wr_status wr_status
					
					, a.wr_qty_ord-a.wr_qty_comp openQty
					, wo_ord_date wo_ord_date
					, CASE WHEN b.wo_so_job = 'dropin' THEN 1 ELSE 0 END dropInClass
					, b.wo_so_job wo_so_job
					, b.wo_rmks wo_rmks 
                    , CASE 
					WHEN b.wo_so_job = 'dropin' 
						THEN wr_due
					ELSE 
						CASE 
							WHEN a.wr_op = 10
								THEN 
									CASE 
										WHEN DAYOFWEEK ( wr_due ) IN (1)
											THEN wr_due - 6
											WHEN DAYOFWEEK ( wr_due ) IN (2)
												THEN wr_due - 7
												WHEN DAYOFWEEK ( wr_due ) IN (3)
													THEN wr_due - 7
													WHEN DAYOFWEEK ( wr_due ) IN (4)
														THEN wr_due - 7
														WHEN DAYOFWEEK ( wr_due ) IN (5)
															THEN wr_due - 7
															WHEN DAYOFWEEK ( wr_due ) IN (6)
																THEN wr_due - 8
																WHEN DAYOFWEEK ( wr_due ) IN (7)
																	THEN wr_due - 5
										ELSE wr_due - 5
							END 
							WHEN a.wr_op = 20
								THEN 
								CASE 
										WHEN DAYOFWEEK ( wr_due ) IN (1)
											THEN wr_due - 4
											WHEN DAYOFWEEK ( wr_due ) IN (2)
												THEN wr_due - 5
												WHEN DAYOFWEEK ( wr_due ) IN (3)
													THEN wr_due - 5
													WHEN DAYOFWEEK ( wr_due ) IN (4)
														THEN wr_due - 5
														WHEN DAYOFWEEK ( wr_due ) IN (5)
															THEN wr_due - 3
															WHEN DAYOFWEEK ( wr_due ) IN (6)
																THEN wr_due - 3
																WHEN DAYOFWEEK ( wr_due ) IN (7)
																	THEN wr_due - 3
										ELSE wr_due - 3
								END 
							WHEN a.wr_op = 30
								THEN 
								CASE 
								WHEN DAYOFWEEK ( wr_due ) IN (1)
									THEN wr_due - 2
									WHEN DAYOFWEEK ( wr_due ) IN (2, 3)
										THEN wr_due - 4
									WHEN DAYOFWEEK ( wr_due ) IN (4)
										THEN wr_due - 2
									ELSE wr_due - 2
								END 			
						END 
				END dueBy
					, CONCAT(pt_desc1, pt_desc2) fullDesc
				FROM wr_route a
				LEFT JOIN (
					SELECT wo_nbr
						, min(wo_ord_date) wo_ord_date
						, max(wo_so_job) wo_so_job
						, max(wo_rmks) wo_rmks
					FROM wo_mstr
					WHERE wo_domain = 'EYE'
					GROUP BY wo_nbr
				) b ON b.wo_nbr = a.wr_nbr
				
				LEFT JOIN ( 
					select pt_part
						, max(pt_desc1) pt_desc1
						, max(pt_desc2) pt_desc2
					from pt_mstr
					WHERE pt_domain = 'EYE'
					group by pt_part
				) c ON c.pt_part = a.wr_part
				
				WHERE a.wr_domain = 'EYE'
					AND wr_qty_comp != a.wr_qty_ord
					AND a.wr_part = :part
					AND a.wr_status != 'C'
				with (noLock) 
			";

		$query = $this->db->prepare($mainQry);
		$query->bindParam(":part", $part, PDO::PARAM_STR);
		$query->execute();
		$details = $query->fetchAll(PDO::FETCH_ASSOC);

		return $details;
	}
	public function getRoutingByWoNumber($wo_nbr)
	{
		$obj = array();

		//details 
		$mainQry = "
			
				SELECT a.wr_nbr wr_nbr
					, a.wr_op wr_op
					, a.wr_desc wr_desc
					, a.wr_wkctr wr_wkctr
					, a.wr_qty_ord wr_qty_ord
					, a.wr_qty_comp wr_qty_comp
					, a.wr_due wr_due
					, a.wr_part wr_part
					, a.wr_status wr_status
					
					, a.wr_qty_ord-a.wr_qty_comp openQty
					, wo_ord_date wo_ord_date
					, CASE WHEN b.wo_so_job = 'dropin' THEN 1 ELSE 0 END dropInClass
					, b.wo_so_job wo_so_job
					, b.wo_rmks wo_rmks 
                    , CASE 
					WHEN b.wo_so_job = 'dropin' 
						THEN wr_due
					ELSE 
						CASE 
							WHEN a.wr_op = 10
								THEN 
									CASE 
										WHEN DAYOFWEEK ( wr_due ) IN (1)
											THEN wr_due - 6
											WHEN DAYOFWEEK ( wr_due ) IN (2)
												THEN wr_due - 7
												WHEN DAYOFWEEK ( wr_due ) IN (3)
													THEN wr_due - 7
													WHEN DAYOFWEEK ( wr_due ) IN (4)
														THEN wr_due - 7
														WHEN DAYOFWEEK ( wr_due ) IN (5)
															THEN wr_due - 7
															WHEN DAYOFWEEK ( wr_due ) IN (6)
																THEN wr_due - 8
																WHEN DAYOFWEEK ( wr_due ) IN (7)
																	THEN wr_due - 5
										ELSE wr_due - 5
							END 
							WHEN a.wr_op = 20
								THEN 
								CASE 
										WHEN DAYOFWEEK ( wr_due ) IN (1)
											THEN wr_due - 4
											WHEN DAYOFWEEK ( wr_due ) IN (2)
												THEN wr_due - 5
												WHEN DAYOFWEEK ( wr_due ) IN (3)
													THEN wr_due - 5
													WHEN DAYOFWEEK ( wr_due ) IN (4)
														THEN wr_due - 5
														WHEN DAYOFWEEK ( wr_due ) IN (5)
															THEN wr_due - 3
															WHEN DAYOFWEEK ( wr_due ) IN (6)
																THEN wr_due - 3
																WHEN DAYOFWEEK ( wr_due ) IN (7)
																	THEN wr_due - 3
										ELSE wr_due - 3
								END 
							WHEN a.wr_op = 30
								THEN 
								CASE 
								WHEN DAYOFWEEK ( wr_due ) IN (1)
									THEN wr_due - 2
									WHEN DAYOFWEEK ( wr_due ) IN (2, 3)
										THEN wr_due - 4
									WHEN DAYOFWEEK ( wr_due ) IN (4)
										THEN wr_due - 2
									ELSE wr_due - 2
								END 			
						END 
				END dueBy
					, CONCAT(pt_desc1, pt_desc2) fullDesc
				FROM wr_route a
				LEFT JOIN (
					SELECT wo_nbr
						, min(wo_ord_date) wo_ord_date
						, max(wo_so_job) wo_so_job
						, max(wo_rmks) wo_rmks
					FROM wo_mstr
					WHERE wo_domain = 'EYE'
					GROUP BY wo_nbr
				) b ON b.wo_nbr = a.wr_nbr
				
				LEFT JOIN ( 
					select pt_part
						, max(pt_desc1) pt_desc1
						, max(pt_desc2) pt_desc2
					from pt_mstr
					WHERE pt_domain = 'EYE'
					group by pt_part
				) c ON c.pt_part = a.wr_part
				
				WHERE a.wr_domain = 'EYE'
					AND a.wr_nbr = :wo_nbr
				with (noLock) 
			";

		$query = $this->db->prepare($mainQry);
		$query->bindParam(":wo_nbr", $wo_nbr, PDO::PARAM_STR);
		$query->execute();
		$details = $query->fetchAll(PDO::FETCH_ASSOC);

		return $details;
	}
}
