<?php

class OnTimeShipmentReport
{

	protected $db;

	public function __construct($dbQad, $db)
	{

		$this->db = $dbQad;
		$this->db1 = $db;
		$this->nowDate = date("Y-m-d", time());
		$this->dateNow = date("Y-m-d");

		$this->customers = $this->getCustomers();
	}

	public function getCustomers()
	{
		$mainQry = "select cm_addr cm_addr from cm_mstr where cm_domain = 'EYE' GROUP BY cm_addr WITH (NOLOCK)";

		$query = $this->db->prepare($mainQry);
		$query->execute();
		$results = $query->fetchAll(PDO::FETCH_ASSOC);

		$newResults = array();
		foreach ($results as $row) {
			$newResults[] = $row['CM_ADDR'];
		}

		return $newResults;
	}

	public function overall($dateFrom, $dateTo)
	{
		$mainQry = "
			  select *from (select c.so_cust so_cust
					, count(0) total
					, (sum(case 
					when a.sod_req_date-f.abs_shp_date < 0 AND a.sod_req_date < curDate()
					THEN 0
					when f.abs_shp_date IS NULL
					THEN 0
					when a.sod_req_date < curDate() AND a.sod_qty_ord != f.abs_ship_qty
					THEN 0 
					ELSE 1 
				END) / count(0))*100 onTimeShipment
					, (sum(case 
				when a.sod_req_date-f.abs_shp_date < 0 AND a.sod_req_date < curDate()
				THEN 1 
				when f.abs_shp_date IS NULL
				THEN 1
				when a.sod_req_date < curDate() AND a.sod_qty_ord != f.abs_ship_qty
				THEN 1 
				ELSE 0 
			END) / count(0))*100 delayedShipment
				from sod_det a
				left join (
					select so_nbr	
						, so_cust
						, so_ord_date
						, so_ship
						, so_bol
						, so_cmtindx
					from so_mstr
					where so_domain = 'EYE'
				) c ON c.so_nbr = a.sod_nbr
				
				LEFT join (
					select abs_shipto
						, abs_shp_date
						, abs_item
						, abs_line
						, sum(abs_ship_qty) abs_ship_qty
						, abs_inv_nbr
						, abs_par_id
						, abs_order
					from abs_mstr 
					where abs_domain = 'EYE'
					GROUP BY abs_shipto
						, abs_shp_date
						, abs_item
						, abs_line
						, abs_inv_nbr
						, abs_par_id
						, abs_order
				) f ON f.abs_order = a.sod_nbr
					AND f.abs_line = a.sod_line
				WHERE sod_domain = 'EYE'
					and sod_req_date between :dateFrom and :dateTo
				GROUP BY c.so_cust
				ORDER BY so_cust ASC 
				) a
				WITH (NOLOCK)
			";

		$query = $this->db->prepare($mainQry);
		$query->bindParam(":dateFrom", $dateFrom, PDO::PARAM_STR);
		$query->bindParam(":dateTo", $dateTo, PDO::PARAM_STR);
		$query->execute();
		$results = $query->fetchAll(PDO::FETCH_ASSOC);

		$mainQry = "
			select c.so_cust so_cust
				, a.sod_req_date sod_due_date
				, f.abs_shp_date abs_shp_date
				, sod_nbr sod_nbr
				, IFNULL(abs_ship_qty, 0) abs_ship_qty
				, sod_qty_ord sod_qty_ord
				, IFNULL(case 
				when a.sod_req_date-f.abs_shp_date < 0 AND a.sod_req_date < curDate()
				THEN 0
				when f.abs_shp_date IS NULL
				THEN 0
				when a.sod_req_date < curDate() AND a.sod_qty_ord != f.abs_ship_qty
				THEN 0 
				ELSE 1 
			END,0) onTime
				, IFNULL(case 
				when a.sod_req_date-f.abs_shp_date < 0 AND a.sod_req_date < curDate()
				THEN 1 
				when f.abs_shp_date IS NULL
				THEN 1
				when a.sod_req_date < curDate() AND a.sod_qty_ord != f.abs_ship_qty
				THEN 1 
				ELSE 0 
			END,0) delayed
			from sod_det a
				left join (
					select so_nbr	
						, so_cust
						, so_ord_date
						, so_ship
						, so_bol
						, so_cmtindx
					from so_mstr
					where so_domain = 'EYE'
				) c ON c.so_nbr = a.sod_nbr
				
				LEFT join (
					select abs_shipto
						, abs_shp_date
						, abs_item
						, abs_line
						, sum(abs_ship_qty) abs_ship_qty
						, abs_inv_nbr
						, abs_par_id
						, abs_order
					from abs_mstr 
					where abs_domain = 'EYE'
					GROUP BY abs_shipto
						, abs_shp_date
						, abs_item
						, abs_line
						, abs_inv_nbr
						, abs_par_id
						, abs_order
				) f ON f.abs_order = a.sod_nbr
					AND f.abs_line = a.sod_line
				WHERE sod_domain = 'EYE'
					and sod_req_date between :dateFrom and :dateTo
				ORDER BY a.sod_req_date ASC 
				WITH (NOLOCK)
			";

		$query = $this->db->prepare($mainQry);
		$query->bindParam(":dateFrom", $dateFrom, PDO::PARAM_STR);
		$query->bindParam(":dateTo", $dateTo, PDO::PARAM_STR);
		$query->execute();
		$details = $query->fetchAll(PDO::FETCH_ASSOC);

		$legend = array();
		$onTimeShipment = array();
		$delayedShipment = array();
		
		foreach ($results as $row) {
			$legend[] = $row['SO_CUST'];
			$onTimeShipment[] = $row['ONTIMESHIPMENT'];
			$delayedShipment[] = $row['DELAYEDSHIPMENT'];
		}

		return array(
			"legend" => $legend,
			"value" => $onTimeShipment,
			"value1" => $delayedShipment,
			"details" => $details
		);
	}

	public function byCustomer($dateFrom, $dateTo, $customer)
	{
		$mainQry = "
			select MONTH(a.sod_req_date) month
				, YEAR(a.sod_req_date) year
				, sum(case 
				when a.sod_req_date-f.abs_shp_date < 0 AND a.sod_req_date < curDate()
				THEN 0
				when f.abs_shp_date IS NULL
				THEN 0
				when a.sod_req_date < curDate() AND a.sod_qty_ord != f.abs_ship_qty
				THEN 0 
				ELSE 1 
			END) onTimeShipmentCount
				, sum(case 
				when a.sod_req_date-f.abs_shp_date < 0 AND a.sod_req_date < curDate()
				THEN 1 
				when f.abs_shp_date IS NULL
				THEN 1
				when a.sod_req_date < curDate() AND a.sod_qty_ord != f.abs_ship_qty
				THEN 1 
				ELSE 0 
			END) delayedShipmentCount
				, count(0) total

				, (sum(case 
				when a.sod_req_date-f.abs_shp_date < 0 AND a.sod_req_date < curDate()
				THEN 0
				when f.abs_shp_date IS NULL
				THEN 0
				when a.sod_req_date < curDate() AND a.sod_qty_ord != f.abs_ship_qty
				THEN 0 
				ELSE 1 
			END) / count(0))*100 onTimeShipment
				, (sum(case 
				when a.sod_req_date-f.abs_shp_date < 0 AND a.sod_req_date < curDate()
				THEN 1 
				when f.abs_shp_date IS NULL
				THEN 1
				when a.sod_req_date < curDate() AND a.sod_qty_ord != f.abs_ship_qty
				THEN 1 
				ELSE 0 
			END) / count(0))*100 delayedShipment
				
				
			from sod_det a
			
			left join (
				select so_nbr	
						, so_cust
						, so_ord_date
						, so_ship
						, so_bol
						, so_cmtindx
				from so_mstr
				where so_domain = 'EYE'
			) c ON c.so_nbr = a.sod_nbr
			
			LEFT join (
				select abs_shipto
						, abs_shp_date
						, abs_item
						, abs_line
						, sum(abs_ship_qty) abs_ship_qty
						, abs_inv_nbr
						, abs_par_id
						, abs_order
				from abs_mstr 
				where abs_domain = 'EYE'
				GROUP BY abs_shipto
						, abs_shp_date
						, abs_item
						, abs_line
						, abs_inv_nbr
						, abs_par_id
						, abs_order
			) f ON f.abs_order = a.sod_nbr
				AND f.abs_line = a.sod_line
			WHERE sod_domain = 'EYE'
				and sod_req_date between :dateFrom and :dateTo
				and c.so_cust = :customer
			GROUP BY MONTH(a.sod_req_date),
				YEAR(a.sod_req_date)
			ORDER BY c.so_cust ASC 
			WITH (NOLOCK)
		";

		$query = $this->db->prepare($mainQry);
		$query->bindParam(":dateFrom", $dateFrom, PDO::PARAM_STR);
		$query->bindParam(":dateTo", $dateTo, PDO::PARAM_STR);
		$query->bindParam(":customer", $customer, PDO::PARAM_STR);
		$query->execute();
		$results = $query->fetchAll(PDO::FETCH_ASSOC);

		$mainQry = "
			select c.so_cust so_cust
				, a.sod_req_date sod_due_date
				, f.abs_shp_date abs_shp_date
				, MONTHNAME(a.sod_req_date) month
				, YEAR(a.sod_req_date) year
				, sod_nbr sod_nbr
				, IFNULL(abs_ship_qty, 0) abs_ship_qty
				, sod_qty_ord sod_qty_ord
				, IFNULL(case 
				when a.sod_req_date-f.abs_shp_date < 0 AND a.sod_req_date < curDate()
				THEN 0
				when f.abs_shp_date IS NULL
				THEN 0
				when a.sod_req_date < curDate() AND a.sod_qty_ord != f.abs_ship_qty
				THEN 0 
				ELSE 1 
			END,0) onTime
				, IFNULL(case 
				when a.sod_req_date-f.abs_shp_date < 0 AND a.sod_req_date < curDate()
				THEN 1 
				when f.abs_shp_date IS NULL
				THEN 1
				when a.sod_req_date < curDate() AND a.sod_qty_ord != f.abs_ship_qty
				THEN 1 
				ELSE 0 
			END,0) delayed
			from sod_det a
				left join (
					select so_nbr	
						, so_cust
						, so_ord_date
						, so_ship
						, so_bol
						, so_cmtindx
					from so_mstr
					where so_domain = 'EYE'
				) c ON c.so_nbr = a.sod_nbr
				
				LEFT join (
					select abs_shipto
						, abs_shp_date
						, abs_item
						, abs_line
						, sum(abs_ship_qty) abs_ship_qty
						, abs_inv_nbr
						, abs_par_id
						, abs_order
					from abs_mstr 
					where abs_domain = 'EYE'
					GROUP BY abs_shipto
						, abs_shp_date
						, abs_item
						, abs_line
						, abs_inv_nbr
						, abs_par_id
						, abs_order
				) f ON f.abs_order = a.sod_nbr
					AND f.abs_line = a.sod_line
				WHERE sod_domain = 'EYE'
					and sod_req_date between :dateFrom and :dateTo
					and c.so_cust = :customer
				ORDER BY a.sod_req_date ASC 
				WITH (NOLOCK)
			";

		$query = $this->db->prepare($mainQry);
		$query->bindParam(":dateFrom", $dateFrom, PDO::PARAM_STR);
		$query->bindParam(":dateTo", $dateTo, PDO::PARAM_STR);
		$query->bindParam(":customer", $customer, PDO::PARAM_STR);
		$query->execute();
		$details = $query->fetchAll(PDO::FETCH_ASSOC);

		$legend = array();
		$onTimeShipment = array();
		$delayedShipment = array();
		$onTimeShipmentCount = array();
		$delayedShipmentCount = array();
		foreach ($results as $row) {
			$legend[] = getMonthName($row['MONTH']) . "-" . $row['YEAR'];
			$onTimeShipment[] = $row['ONTIMESHIPMENT'];
			$delayedShipment[] = $row['DELAYEDSHIPMENT'];
			$onTimeShipmentCount[] = $row['ONTIMESHIPMENTCOUNT'];
			$delayedShipmentCount[] = $row['DELAYEDSHIPMENTCOUNT'];
		}

		return array(
			"legend" => $legend,
			"value" => $onTimeShipment,
			"value1" => $delayedShipment,
			"value2" => $onTimeShipmentCount,
			"value3" => $delayedShipmentCount,
			"customers" => $this->customers,
			"details" => $details
		);
	}

	public function byProduct($dateFrom, $dateTo, $customer)
	{
		$mainQry = "
                     select a.sod_part sod_part
                            , sum(case 
							when a.sod_req_date-f.abs_shp_date < 0 AND a.sod_req_date < curDate()
							THEN 0
							when f.abs_shp_date IS NULL
							THEN 0
							when a.sod_req_date < curDate() AND a.sod_qty_ord != f.abs_ship_qty
							THEN 0 
							ELSE 1 
						END) onTimeShipmentCount
                            , sum(case 
							when a.sod_req_date-f.abs_shp_date < 0 AND a.sod_req_date < curDate()
							THEN 1 
							when f.abs_shp_date IS NULL
							THEN 1
							when a.sod_req_date < curDate() AND a.sod_qty_ord != f.abs_ship_qty
							THEN 1 
							ELSE 0 
						END) delayedShipmentCount
							
							, count(0) total
							
							, (sum(case 
							when a.sod_req_date-f.abs_shp_date < 0 AND a.sod_req_date < curDate()
							THEN 0
							when f.abs_shp_date IS NULL
							THEN 0
							when a.sod_req_date < curDate() AND a.sod_qty_ord != f.abs_ship_qty
							THEN 0 
							ELSE 1 
						END) / count(0))*100 onTimeShipment
							, (sum(case 
							when a.sod_req_date-f.abs_shp_date < 0 AND a.sod_req_date < curDate()
							THEN 1 
							when f.abs_shp_date IS NULL
							THEN 1
							when a.sod_req_date < curDate() AND a.sod_qty_ord != f.abs_ship_qty
							THEN 1 
							ELSE 0 
						END) / count(0))*100 delayedShipment

                     from sod_det a
                     
                     left join (
                            select so_nbr	
                                   , so_cust
                                   , so_ord_date
                                   , so_ship
                                   , so_bol
                                   , so_cmtindx
                            from so_mstr
                            where so_domain = 'EYE'
                     ) c ON c.so_nbr = a.sod_nbr
                     
                     LEFT join (
                            select abs_shipto
                                   , abs_shp_date
                                   , abs_item
                                   , abs_line
                                   , sum(abs_ship_qty) abs_ship_qty
                                   , abs_inv_nbr
                                   , abs_par_id
                                   , abs_order
                            from abs_mstr 
                            where abs_domain = 'EYE'
                            GROUP BY abs_shipto
                                   , abs_shp_date
                                   , abs_item
                                   , abs_line
                                   , abs_inv_nbr
                                   , abs_par_id
                                   , abs_order
                     ) f ON f.abs_order = a.sod_nbr
                            AND f.abs_line = a.sod_line
                     WHERE sod_domain = 'EYE'
                            and sod_req_date between :dateFrom and :dateTo
                            and c.so_cust = :customer
                     GROUP BY a.sod_part
                     ORDER BY a.sod_req_date ASC 
                     WITH (NOLOCK)
              ";

		$query = $this->db->prepare($mainQry);
		$query->bindParam(":dateFrom", $dateFrom, PDO::PARAM_STR);
		$query->bindParam(":dateTo", $dateTo, PDO::PARAM_STR);
		$query->bindParam(":customer", $customer, PDO::PARAM_STR);
		$query->execute();
		$results = $query->fetchAll(PDO::FETCH_ASSOC);

		$mainQry = "
			select c.so_cust so_cust
				, a.sod_req_date sod_due_date
				, f.abs_shp_date abs_shp_date
				, a.sod_part sod_part
				, sod_nbr sod_nbr
				, IFNULL(abs_ship_qty, 0) abs_ship_qty
				, sod_qty_ord sod_qty_ord
				, IFNULL(case 
				when a.sod_req_date-f.abs_shp_date < 0 AND a.sod_req_date < curDate()
				THEN 0
				when f.abs_shp_date IS NULL
				THEN 0
				when a.sod_req_date < curDate() AND a.sod_qty_ord != f.abs_ship_qty
				THEN 0 
				ELSE 1 
			END,0) onTime
				, IFNULL(case 
				when a.sod_req_date-f.abs_shp_date < 0 AND a.sod_req_date < curDate()
				THEN 1 
				when f.abs_shp_date IS NULL
				THEN 1
				when a.sod_req_date < curDate() AND a.sod_qty_ord != f.abs_ship_qty
				THEN 1 
				ELSE 0 
			END,0) delayed
				, b.pt_desc1 pt_desc1
			from sod_det a

				LEFT JOIN ( 
					select pt_part
						, max(pt_desc1) pt_desc1
						, max(pt_desc2) pt_desc2
					from pt_mstr
					WHERE pt_domain = 'EYE'
					group by pt_part
				) b ON b.pt_part = a.sod_part


				left join (
					select so_nbr	
						, so_cust
						, so_ord_date
						, so_ship
						, so_bol
						, so_cmtindx
					from so_mstr
					where so_domain = 'EYE'
				) c ON c.so_nbr = a.sod_nbr
				
				LEFT join (
					select abs_shipto
						, abs_shp_date
						, abs_item
						, abs_line
						, sum(abs_ship_qty) abs_ship_qty
						, abs_inv_nbr
						, abs_par_id
						, abs_order
					from abs_mstr 
					where abs_domain = 'EYE'
					GROUP BY abs_shipto
						, abs_shp_date
						, abs_item
						, abs_line
						, abs_inv_nbr
						, abs_par_id
						, abs_order
				) f ON f.abs_order = a.sod_nbr
					AND f.abs_line = a.sod_line
				WHERE sod_domain = 'EYE'
					and sod_req_date between :dateFrom and :dateTo
					and c.so_cust = :customer
				ORDER BY a.sod_req_date ASC 
				WITH (NOLOCK)
			";

		$query = $this->db->prepare($mainQry);
		$query->bindParam(":dateFrom", $dateFrom, PDO::PARAM_STR);
		$query->bindParam(":dateTo", $dateTo, PDO::PARAM_STR);
		$query->bindParam(":customer", $customer, PDO::PARAM_STR);
		$query->execute();
		$details = $query->fetchAll(PDO::FETCH_ASSOC);

		$legend = array();
		$onTimeShipment = array();
		$delayedShipment = array();
		$onTimeShipmentCount = array();
		$delayedShipmentCount = array();
		foreach ($results as $row) {
			$legend[] = $row['SOD_PART'];
			$onTimeShipment[] = $row['ONTIMESHIPMENT'];
			$delayedShipment[] = $row['DELAYEDSHIPMENT'];
			$onTimeShipmentCount[] = $row['ONTIMESHIPMENTCOUNT'];
			$delayedShipmentCount[] = $row['DELAYEDSHIPMENTCOUNT'];
		}

		return array(
			"legend" => $legend,
			"value" => $onTimeShipment,
			"value1" => $delayedShipment,
			"value2" => $onTimeShipmentCount,
			"value3" => $delayedShipmentCount,
			"customers" => $this->customers,
			"details" => $details
		);
	}

	public function ReadDetails($date)
	{

		$mainQry = " 
				SELECT a.sod_req_date sod_due_date
					, tr_date tr_date
					, a.sod_qty_ord sod_qty_ord
					, a.sod_qty_ship sod_qty_ship
					, a.sod_line sod_line
					, tr_qty_short tr_qty_short
					, sod_part sod_part
					, sod_nbr sod_nbr
					, hits  hits
					, CASE 
						WHEN tr_date <= a.sod_req_date AND a.sod_qty_ord-a.sod_qty_ship = 0
							THEN 'On Time' 
						WHEN tr_date > a.sod_req_date AND a.sod_qty_ord-a.sod_qty_ship = 0
							THEN sod_req_date-tr_date
						WHEN a.sod_qty_ord-a.sod_qty_ship > 0 AND tr_date < curdate()
							THEN 'Past Due' 
					END onTimeCount1
					, CASE 
						WHEN a.sod_qty_ord-a.sod_qty_ship = 0
							THEN 
								CASE 
									WHEN tr_date <= a.sod_req_date
										THEN 'On Time'
									ELSE sod_req_date-tr_date
								END
						WHEN a.sod_qty_ord-a.sod_qty_ship > 0
							THEN 
								CASE 
									WHEN tr_date <= curdate() THEN 'On Time'
									WHEN tr_date IS NULL THEN 'No Shipments'
								ELSE 'Past Due'
							END
					END onTimeCount
					, case 
						when sod_qty_ord = sod_qty_ship 
							THEN 'Complete' 
						when sod_qty_ship > 0 
							THEN 'Partially Complete' 
						else 'Not complete' 
					end status
					, case 
						when sod_qty_ord = sod_qty_ship 
							THEN 'success' 
						when sod_qty_ship > 0 
							THEN 'warning' 
						else 'danger' 
					end statusClass
				FROM sod_det a  
				LEFT join ( 
					SELECT tr_nbr 
						, tr_line 
						, abs(sum(tr_qty_chg)) tr_qty_short
						, max(tr_date) tr_date
						, count(*) hits
					FROM tr_hist 
					WHERE tr_domain = 'EYE' 
						AND tr_type = 'ISS-SO' 
					GROUP BY tr_nbr
						, tr_line
				) b on b.tr_nbr = a.sod_nbr  
					AND b.tr_line = a.sod_line 
				WHERE a.sod_req_date = :dateFrom
					AND sod_domain = 'EYE' 
					AND sod_nbr NOT LIKE '%SV%'
				ORDER BY tr_date ASC, CASE WHEN tr_date <= a.sod_req_date THEN 'On Time' END ASC
				with (noLock)
			";

		$query = $this->db->prepare($mainQry);
		$query->bindParam(":dateFrom", $date, PDO::PARAM_STR);
		$query->execute();
		$results = $query->fetchAll(PDO::FETCH_ASSOC);

		return $results;
	}

	public function ReadOverview($data)
	{
		$mainQry = "
				SELECT count(sod_req_date) hits  
					, sum(sod_qty_ord) qtyOrdered 
					, sum(sod_qty_ship) qtyShipped 
					, (NULLIF(sum(sod_qty_ship), 0)/sum(sod_qty_ord))*100 percentCompleted 
					, sod_req_date sod_due_date
				FROM sod_det 
				WHERE sod_req_date between :dateFrom AND :dateTo
				AND sod_domain = 'EYE' 
				AND sod_nbr NOT LIKE '%SV%'
				GROUP BY sod_req_date 
				ORDER BY sod_req_date ASC 
				WITH (noLock)
			";

		$query = $this->db->prepare($mainQry);
		$query->bindParam(":dateFrom", $data['dateFrom'], PDO::PARAM_STR);
		$query->bindParam(":dateTo", $data['dateTo'], PDO::PARAM_STR);
		$query->execute();
		$results = $query->fetchAll(PDO::FETCH_ASSOC);

		$obj = array();
		foreach ($results as $row) {
			$obj['totalOrders'][] = $row['HITS'];
			$obj['totalCost'][] = $row['QTYORDERED'];
			$obj['revenueCost'][] = $row['QTYORDERED'] - $row['QTYSHIPPED'];
			$obj['percentCompleted'][] = $row['PERCENTCOMPLETED'];
			$obj['sod_due_date'][] = $row['SOD_DUE_DATE'];
		}

		// Declare and define two dates 

		$begin = new DateTime($data['dateFrom']);
		$end = new DateTime($data['dateTo']);
		$end = $end->modify('+1 day');

		$interval = DateInterval::createFromDateString('1 day');
		$period = new DatePeriod($begin, $interval, $end);

		$mainQry = "
				SELECT COUNT(CASE WHEN sod_req_date = curdate() THEN sod_nbr END) todayOrdersCounts
					, SUM(CASE WHEN sod_req_date = curdate() THEN sod_qty_ship END) todayOrdersQtyShipped
					, SUM(CASE WHEN sod_req_date = curdate() THEN sod_qty_ord END) todayOrdersQtyOrdered 

					, COUNT(CASE WHEN sod_req_date < curdate() AND sod_qty_ord != sod_qty_ship THEN sod_nbr END) pastOrdersCounts
					, SUM(CASE WHEN sod_req_date < curdate() AND sod_qty_ord != sod_qty_ship THEN sod_qty_ship END) pastOrdersQtyShipped
					, SUM(CASE WHEN sod_req_date < curdate() AND sod_qty_ord != sod_qty_ship THEN sod_qty_ord END) pastOrdersQtyOrdered
					
					, COUNT(CASE WHEN sod_req_date > curdate() AND sod_qty_ord != sod_qty_ship THEN sod_nbr END) futureOrdersCounts
					, SUM(CASE WHEN sod_req_date > curdate() AND sod_qty_ord != sod_qty_ship THEN sod_qty_ship END) futureOrdersQtyShipped
					, SUM(CASE WHEN sod_req_date > curdate() AND sod_qty_ord != sod_qty_ship THEN sod_qty_ord END) futureOrdersQtyOrdered
				from sod_det 
				where sod_domain = 'EYE' 
				AND sod_nbr NOT LIKE '%SV%'
				WITH (noLock)
			";
		$query = $this->db->prepare($mainQry);
		$query->execute();
		$obj1 = $query->fetch();

		$obj1['TODAYFIRST'] = 100;
		$obj1['TODAYSECOND'] = 0;
		if ($obj1['TODAYORDERSQTYORDERED']) {
			$obj1['TODAYFIRST'] = ($obj1['TODAYORDERSQTYSHIPPED'] / $obj1['TODAYORDERSQTYORDERED']) * 100;
			$obj1['TODAYSECOND'] = 100 - ($obj1['TODAYORDERSQTYSHIPPED'] / $obj1['TODAYORDERSQTYORDERED']) * 100;
		}

		$obj1['PASTFIRST'] = 100;
		$obj1['PASTSECOND'] = 0;
		if ($obj1['PASTORDERSQTYORDERED']) {
			$obj1['PASTFIRST'] = ($obj1['PASTORDERSQTYSHIPPED'] / $obj1['PASTORDERSQTYORDERED']) * 100;
			$obj1['PASTSECOND'] = 100 - ($obj1['PASTORDERSQTYSHIPPED'] / $obj1['PASTORDERSQTYORDERED']) * 100;
		}

		$obj1['FUTUREFIRST'] = 100;
		$obj1['FUTURESECOND'] = 0;
		if ($obj1['FUTUREORDERSQTYORDERED']) {
			$obj1['FUTUREFIRST'] = ($obj1['FUTUREORDERSQTYSHIPPED'] / $obj1['FUTUREORDERSQTYORDERED']) * 100;
			$obj1['FUTURESECOND'] = 100 - ($obj1['FUTUREORDERSQTYSHIPPED'] / $obj1['FUTUREORDERSQTYORDERED']) * 100;
		}

		$mainQry = "
				select SUM(CASE WHEN tr_date <= a.sod_req_date AND sod_qty_ord = sod_qty_ship THEN 1 ELSE 0 END) onTimeCount
					, COUNT(a.sod_req_date) totalCount
					, a.sod_req_date sod_due_date
					, (SUM(CASE WHEN tr_date <= a.sod_req_date THEN 1 ELSE 0 END) / COUNT(*) ) * 100 myOntime
				from sod_det a  
				left join ( 
					 select tr_nbr 
						, tr_line 
						, abs(sum(tr_qty_chg)) tr_qty_short
						, max(tr_date) tr_date
						, count(*) hits
					from tr_hist 
					where tr_domain = 'EYE' 
						and tr_type = 'ISS-SO' 
					GROUP BY tr_nbr
						, tr_line
				) b on b.tr_nbr = a.sod_nbr  
					and b.tr_line = a.sod_line 
				where a.sod_req_date between :dateFrom and :dateTo
				and sod_domain = 'EYE' 
				AND sod_nbr NOT LIKE '%SV%'
				GROUP BY a.sod_req_date
				ORDER BY a.sod_req_date ASC
				with (noLock) 
			";
		$query = $this->db->prepare($mainQry);
		$query->bindParam(":dateFrom", $data['dateFrom'], PDO::PARAM_STR);
		$query->bindParam(":dateTo", $data['dateTo'], PDO::PARAM_STR);
		$query->execute();
		$onTime = $query->fetchAll(PDO::FETCH_ASSOC);

		$onTimeDet = array();

		$totalOrders = 0;
		$totalOrdersOnTime = 0;



		$ob1 = array();
		$obError = array();

		foreach ($period as $dt) {

			$date = $dt->format("Y-m-d");

			$weekOfdays = date('Y-m-d', strtotime($date));

			$onTimeDet['label'][] = $date;

			$h = 0;
			$orderCount = 0;
			$onTimeCount = 0;
			$myOnTimePercent = 0;
			$classColor = 'rgb(62,185,205)';

			$todayCount = 0;
			$todayOnTimeCount = 0;
			$todayOnTimePercent = 0;
			foreach ($onTime as $row) {
				if ($date == $row['SOD_DUE_DATE']) {

					$h = number_format((float) ($row['ONTIMECOUNT'] / $row['TOTALCOUNT']) * 100, 2, '.', '');
					$orderCount = $row['TOTALCOUNT'];
					$onTimeCount = $row['ONTIMECOUNT'];
					$myOnTimePercent = number_format((float) $row['MYONTIME'], 2, '.', '');

					if ($this->nowDate == $row['SOD_DUE_DATE']) {
						$todayCount = $todayCount + $row['TOTALCOUNT'];
						$todayOnTimeCount = $todayOnTimeCount + $row['ONTIMECOUNT'];

						$classColor = 'rgb(62,185,205)';
					} else {
						$classColor = number_format((float) ($row['ONTIMECOUNT'] / $row['TOTALCOUNT']) * 100, 2, '.', '') >= 75 ? 'rgb(62,149,205, 0.8)' : 'rgb(39,107,151, 0.9)';
					}

					$totalOrders = $totalOrders + $row['TOTALCOUNT'];
					$totalOrdersOnTime = $totalOrdersOnTime + $row['ONTIMECOUNT'];
				}
			}

			$onTimeDet['value'][] = $h;
			$onTimeDet['orderCount'][] = $orderCount;
			$onTimeDet['onTimeCount'][] = $onTimeCount;
			$onTimeDet['myOnTimePercent'][] = $myOnTimePercent;
			$onTimeDet['classColor'][] = $classColor;
		}


		$avgOnTime = 0;
		$todayOnTime = 0;
		if ($totalOrders != 0) {
			$avgOnTime = number_format((float) ($totalOrdersOnTime / $totalOrders) * 100, 2, '.', '');
			$todayOnTime = $todayCount > 0 ? number_format((float) ($todayOnTimeCount / $todayCount) * 100, 2, '.', '') : 0;
		}

		if ($avgOnTime > 75) {
		}

		$ob = array(
			"overall" => $obj, "overview" => $obj1, "onTimeDet" => $onTimeDet, "avgOnTime" => $avgOnTime, "avgOnTimeClass" => $avgOnTime > 75 ? 'text-success' : 'text-danger', "todayOnTime" => $todayOnTime, "todayOnTimeClass" => $todayOnTime > 75 ? 'text-success' : 'text-danger', "details" => $this->ReadDetails($data['dateFrom'], $data['dateTo'])
		);

		return $ob;
	}
}
