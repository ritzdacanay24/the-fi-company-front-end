<?php

class OrderTracker
{

	protected $db;

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
			FROM sod_det 
			WHERE sod_domain = 'EYE'
				AND sod_order_category = :co
			WITH (NOLOCK)
		";
		$query = $this->db->prepare($mainQry);
		$query->bindParam(':so_nbr', $order, PDO::PARAM_STR);
		$query->bindParam(':co', $order, PDO::PARAM_STR);
		$query->execute();
		$results = $query->fetchAll(PDO::FETCH_ASSOC);
		
		return $results;
    }

		public function getOrderInfo($order)
		{

		$obj = array();

		$obj = array(
			"woDetails" => array(),
			"ship" => array(),
			"mainDetails" => array(),
			"trans" => array()
		);

		$attachmentsQry = "
				SELECT a.so
					, a.id
					, a.cl_id
					, b.fileName thumbUrl
					, concat('https://dashboard.eye-fi.com/attachments/inspectionCheckList/', b.fileName) url
				FROM eyefidb.cl_input_main a 
				left join eyefidb.attachments b 
					ON a.id = b.uniqueId 
					and field = 'Checklist'
				where a.so != ''
					AND a.so = :order
					AND a.active = 1
			";
		$attachmentQuery = $this->db1->prepare($attachmentsQry);
		$attachmentQuery->bindParam(':order', $order, PDO::PARAM_STR);
		$attachmentQuery->execute();
		$mainattachment = $attachmentQuery->fetchAll(PDO::FETCH_ASSOC);
		$inspectionId = $mainattachment ? $mainattachment[0]['id'] : false;

		$mainQry = "
				select a.so_nbr
					, a.so_cust
					, a.so_ship
					, a.so_ord_date
					, a.so_req_date
					, a.so_due_date
					, a.so_shipvia
					, a.so_inv_date
					, a.so_ship_date
					, a.so_domain
					, a.so_ord_date-a.so_ship_date age
					, a.so_po
				from so_mstr a
				
				LEFT JOIN (
					SELECT sod_nbr
						, max(sod_order_category) sod_order_category
					FROM sod_det 
					WHERE sod_domain = 'EYE'
					GROUP BY sod_nbr
				) b ON b.sod_nbr = a.so_nbr
				
				where ( a.so_nbr = :so_nbr OR b.sod_order_category = :co)
				and a.so_domain = 'EYE'
				WITH (NOLOCK)
			";

		$query = $this->db->prepare($mainQry);
		$query->bindParam(':so_nbr', $order, PDO::PARAM_STR);
		$query->bindParam(':co', $order, PDO::PARAM_STR);
		$query->execute();
		$main = $query->fetch();
		//$main = $query->fetchAll(PDO::FETCH_ASSOC); 
		$multipleSo = array();
		while ($row = $query->fetch()) {
			$multipleSo[] = $row['SO_NBR'];
		}

		$orderFound = true;
		if (!$main) {
			$orderFound = false;
			$obj['orderFound'] =  $orderFound;
		}

		$order = $main['SO_NBR'];
		$so_ship = $main['SO_SHIP'];


		if ($orderFound) {


			$mainQry = "
					select ad_addr
						, ad_name	
						, ad_line2
						, ad_city
						, ad_state
						, ad_zip
						, ad_type
						, ad_ref
						, ad_country
					from ad_mstr 
					where ad_addr = :so_ship 
						AND ad_domain = 'EYE'
					WITH (NOLOCK)
				";

			$query = $this->db->prepare($mainQry);
			$query->bindParam(':so_ship', $so_ship, PDO::PARAM_STR);
			$query->execute();
			$address = $query->fetch();

			$mainQry = "
					select a.sod_part
						, a.sod_due_date
						, a.sod_req_date
						, a.sod_line
						, a.sod_qty_ord
						, a.sod_qty_all
						, a.sod_qty_pick
						, a.sod_qty_ship
						, a.sod_qty_inv
						, a.sod_domain
						, a.sod_price
						, (a.sod_qty_ship/NULLIF(a.sod_qty_ord, 0))*100 percent
						
						, case when a.sod_qty_ord = a.sod_qty_ship THEN 'text-success' END statusClass
						, b.abs_shp_date
						, a.sod_qty_ord-(a.sod_qty_all+a.sod_qty_pick+a.sod_qty_ship) short
						, a.sod_nbr
						, a.sod_order_category
						, a.sod_custpart 
						, c.cmt_cmmt
						, a.sod_qty_ord * a.sod_price total_cost
						
					from sod_det a
					
					LEFT JOIN (
						select max(abs_shp_date) abs_shp_date
							, abs_item
							, abs_line
							, abs_order
						from abs_mstr 
						WHERE abs_shp_date IS NOT NULL
							AND abs_domain = 'EYE'
							and abs_ship_qty > 0
						GROUP BY abs_item
							, abs_line
							, abs_order
					) b ON b.abs_item = a.sod_part
						AND b.abs_line = a.sod_line
						AND b.abs_order = a.sod_nbr
					
					LEFT JOIN (
						select cmt_cmmt
							, cmt_indx
						from cmt_det 
						where cmt_domain = 'EYE' 
					) c ON c.cmt_indx = a.sod_cmtindx
					
					where a.sod_nbr = :so_nbr
					and a.sod_domain = 'EYE'
					ORDER BY a.sod_line
					WITH (NOLOCK)
				";

			$query = $this->db->prepare($mainQry);
			$query->bindParam(':so_nbr', $order, PDO::PARAM_STR);
			$query->execute();
			$mainDetails1 = $query->fetchAll(PDO::FETCH_ASSOC);

			$mainQry = "
					SELECT a.orderNum
						, CASE WHEN a.comments_html != '' THEN comments_html ELSE comments END comments
						, a.createdDate
					FROM eyefidb.comments a
					INNER JOIN (
						SELECT orderNum
							, MAX(id) id
							, MAX(date(createdDate)) createdDate
						FROM eyefidb.comments
						GROUP BY orderNum
					) b ON a.orderNum = b.orderNum AND a.id = b.id
					WHERE type = 'Sales Order'
				";

			$query = $this->db1->prepare($mainQry);
			$query->bindParam(':so_nbr', $order, PDO::PARAM_STR);
			$query->execute();
			$lineComments = $query->fetchAll(PDO::FETCH_ASSOC);

			$picked = 0;
			$shipped = 0;
			$ordered = 0;
			$inv = 0;
			$lines = 0;
			$price = 0;


			$workOrderOwner = "
					SELECT *
					FROM eyefidb.workOrderOwner a
					where so = :soLine
				";

			foreach ($mainDetails1 as $row) {
				$row['COMMENTS'] = false;
				$row['COMMENTSMAX'] = '';
				$soLine = $row['sod_nbr'] . "-" . $row['sod_line'];

				foreach ($lineComments as $row1) {
					if ($row1['orderNum'] == $soLine) {
						$row['COMMENTS'] = true;
						$row['COMMENTSMAX'] = $row1['comments'];
					}
				}

				$picked = $row['sod_qty_pick'] + $picked;
				$shipped = $row['sod_qty_ship'] + $shipped;
				$ordered = $row['sod_qty_ord'] + $ordered;
				$inv = $row['sod_qty_inv'] + $inv;
				$price = ($row['sod_qty_ord'] * $row['sod_price']) + $price;
				$lines++;

				$row['CMT_CMMT'] = str_replace(';', "", $row['CMT_CMMT']);



				//custom Info
				$queryworkOrderOwner = $this->db1->prepare($workOrderOwner);
				$queryworkOrderOwner->bindParam(':soLine', $soLine, PDO::PARAM_STR);
				$queryworkOrderOwner->execute();
				$customInfoDetails = $queryworkOrderOwner->fetch();

				$row['fs_install_date'] = "";
				$row['fs_install'] = "";
				if ($customInfoDetails) {
					$row['fs_install_date'] = $customInfoDetails['fs_install_date'];
					$row['fs_install'] = $customInfoDetails['fs_install'];
				}


				$mainDetails[] = $row;
			}

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
			$trans = $query->fetchAll(PDO::FETCH_ASSOC);

			$mainQry = "
					select abs_shipto
						, abs_shp_date
						, abs_item
						, abs_line
						, sum(abs_ship_qty) abs_ship_qty
						, abs_inv_nbr
						, abs_par_id
						, max(abs_shp_date) last_ship_date
						, sum(abs_ship_qty * sod_price) amount_shipped
					from abs_mstr 
					left join (
						select sod_price
							, sod_line
							, sod_nbr
						from sod_det a
						where sod_domain = 'EYE'
					) b ON b.sod_line = abs_line 
						AND b.sod_nbr = abs_order
					where abs_order = :so_nbr 
					and abs_domain = 'EYE'
					and abs_ship_qty > 0
					GROUP BY abs_shipto
						, abs_shp_date
						, abs_item
						, abs_line
						, abs_inv_nbr
						, abs_par_id
					with (noLock)
				";

			$query = $this->db->prepare($mainQry);
			$query->bindParam(':so_nbr', $order, PDO::PARAM_STR);
			$query->execute();
			$ship = $query->fetchAll(PDO::FETCH_ASSOC);

			$mainQry = "
					select a.wo_nbr 
						, b.wod_lot
						, b.wod_iss_date
						, b.wod_qty_req
						, b.wod_qty_all
						, b.wod_qty_pick
						, b.wod_qty_iss
						, b.wod_part
						, CASE 
							WHEN b.wod_qty_req = 0 
								THEN '100.00'
							WHEN b.wod_qty_req > 0 
								THEN (wod_qty_iss/NULLIF(b.wod_qty_req, 0))*100 
						END percent
						, case when b.wod_qty_req = b.wod_qty_iss then 'Complete' end status
						, case when b.wod_qty_req = b.wod_qty_iss then 'text-success' end statusClass
						, b.wod_qty_req-(b.wod_qty_all+b.wod_qty_pick+b.wod_qty_iss) short
					from wo_mstr a
					INNER JOIN wod_det b ON a.wo_nbr = b.wod_nbr and wod_domain = 'EYE'
					where CASE WHEN SUBSTRING(a.wo_so_job , 1, 2) = 'SO' THEN a.wo_so_job ELSE CONCAT('SO', a.wo_so_job) END = :so_nbr 
					and a.wo_domain = 'EYE' 
					with (noLock)
				";

			$query = $this->db->prepare($mainQry);
			$query->bindParam(':so_nbr', $order, PDO::PARAM_STR);
			$query->execute();
			$woDetails = $query->fetchAll(PDO::FETCH_ASSOC);

			$woOverall = 0;
			$woTotal = 0;
			$woIssue = 0;
			foreach ($woDetails as $row) {
				$woTotal = $row['wod_qty_req'] + $woTotal;
				$woIssue = $row['wod_qty_iss'] + $woIssue;
			}


			$obj = array(
				"main" => $main, "multipleSo" => $multipleSo, "mainDetails" => $mainDetails, "trans" => $trans, "picked" => $picked, "ordered" => $ordered, "shipped" => $shipped, "inv" => $inv, "lines" => $lines, "price" => $price, "woDetails" => $woDetails, "ship" => $ship, "address" => $address, "orderFound" => $orderFound, "woOverall" => $woTotal > 0 ? ($woIssue / $woTotal) * 100 : "0.00", "lineOverall" => $shipped > 0 ? ($shipped / $ordered) * 100 : "0.00", "mainattachment" => $mainattachment, "inspectionId" => $inspectionId, "orderFound" => true
			);
		}

		return $obj;
	}
}
