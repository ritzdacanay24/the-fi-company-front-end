<?php

class RevenueReport
{

	protected $db;

	public function __construct($db)
	{

		$this->db = $db;
	}

	public function getRevenueDetails($dateFrom, $dateTo)
	{
		$qry = "
			select idh_std_cost
			, idh_price
			, idh_qty_inv
			, idh_qty_ship
			, idh_line
			, idh_part
			, idh_acct
			, PostingLineDebitPC
			, PostingLineDebitCC
			, PostingLineDebitTC
			, PostingLineDebitLC
			, PostingLineCreditCC
			, PostingLineCreditTC
			, PostingLineCreditLC
			, LastModifiedUser
			, PostingDate
			, idh_inv_nbr
			, CM_SORT
					
				from PostingLine a
				
				left join (
					select a.Posting_ID
						, a.DInvoice_ID
					from DInvoicePosting a
				) b ON b.Posting_ID = a.Posting_ID
				
				left join (
					select a.DInvoice_ID
						, a.DInvoiceDIText
						, DInvoiceVoucher
					from DInvoice a
				) c ON c.DInvoice_ID = b.DInvoice_ID
				
				left JOIN (
					select a.idh_inv_nbr
						, cm_sort
						, so_cust
						, idh_acct
						, idh_part
						, idh_line
						, idh_qty_ship
						, idh_qty_inv
						, idh_price
						, idh_std_cost
					from idh_hist a
					LEFT JOIN (
						select so_nbr
							, so_cust
						from so_mstr
						WHERE so_domain = 'EYE'
					) e ON e.so_nbr = a.idh_nbr
					LEFT JOIN (
						SELECT cm_addr 
							, max(cm_sort) cm_sort
						FROM cm_mstr 
						WHERE cm_domain = 'EYE'
						GROUP BY cm_addr
					) c ON e.so_cust = c.cm_addr
					where a.idh_domain = 'EYE'
					and idh_acct IN (47000, 47900, 47950, 47960, 47500, 47903)
					group by a.idh_inv_nbr
						, cm_sort
						, so_cust
						, idh_acct
						, idh_part
						, idh_line
						, idh_qty_ship
						, idh_qty_inv
						, idh_price
						, idh_std_cost
				) d  ON d.idh_inv_nbr = c.DInvoiceDIText
				where a.GL_ID IN (15774615, 15774616, 15790482, 15790530, 15774617, 15774618, 27413065, 27353092)
					and a.PostingDate between  :dateFrom and :dateTo
				ORDER BY d.cm_sort ASC
				
			";

		$query = $this->db->prepare($qry);
		$query->bindParam(':dateFrom', $dateFrom, PDO::PARAM_STR);
		$query->bindParam(':dateTo', $dateTo, PDO::PARAM_STR);
		$query->execute();
		$results = $query->fetchAll(PDO::FETCH_ASSOC);
		return $results;
	}

	public function convertMonthNumberToName($monthNum)
	{
		$dateObj = \DateTime::createFromFormat('!m', $monthNum);
		return $dateObj->format('M'); // March
	}

	public function getFutureRevenueByCustomerChart()
	{
	}

	function getStartAndEndDate1($week, $year) {
		$dateTime = new DateTime();
		$dateTime->setISODate($year, $week);
		$result['start_date'] = $dateTime->format('Y-m-d');
		$dateTime->modify('+6 days');
		$result['end_date'] = $dateTime->format('Y-m-d');
		return $result;
	  }

	  function getStartAndEndDate($week, $year) {
		  $dateTime = new DateTime();
		  $dateTime->setISODate($year, $week);
		  $result['start_date'] = $dateTime->format('d-M-Y');
		  $dateTime->modify('+6 days');
		  $result['end_date'] = $dateTime->format('d-M-Y');
		  return $result;
		}
	  

	public function getFutureRevenueByCustomerByWeekly($start, $end, $weekStart, $weekEnd, $applyAgsDiscount = false)
	{
		
		$discountMultiplier = $applyAgsDiscount ? '0.91' : '1.0';
		$dateFrom = $start;
		$dateTo = $end;

		$weekStart = $weekStart;
		$weekEnd = $weekEnd;
		
		$mainQry = "
				select c.so_cust so_cust
					, a.sod_per_date date1,
            (a.sod_price*(a.sod_qty_ord-a.sod_qty_ship)) total,
            case 
                when (c.so_cust) IN ('AMEGAM', 'ZITRO', 'ECLIPSE') then (a.sod_price*(a.sod_qty_ord-a.sod_qty_ship)) * 0.91
                else (a.sod_price*(a.sod_qty_ord-a.sod_qty_ship))
            end revenue_after_tariff,
            case 
                when (c.so_cust) IN ('AMEGAM', 'ZITRO', 'ECLIPSE') then (a.sod_price*(a.sod_qty_ord-a.sod_qty_ship)) * 0.09
                when (c.so_cust) IN ('INTGAM', 'BLUBERI', 'BALTEC', 'EVIGAM', 'SONNY') AND sod_prodline = 'TAR' then (a.sod_price*(a.sod_qty_ord-a.sod_qty_ship))
                else 0
            end tariff_amount,
            case 
                when (c.so_cust) IN ('INTGAM', 'BLUBERI', 'BALTEC', 'EVIGAM', 'SONNY') AND sod_prodline <> 'TAR' then (a.sod_price*(a.sod_qty_ord-a.sod_qty_ship))
                when (c.so_cust) IN ('INTGAM', 'BLUBERI', 'BALTEC', 'EVIGAM', 'SONNY') AND sod_prodline = 'TAR' then 0
                when (c.so_cust) IN ('AMEGAM', 'ZITRO', 'ECLIPSE') then (a.sod_price*(a.sod_qty_ord-a.sod_qty_ship)) * 0.91
                else (a.sod_price*(a.sod_qty_ord-a.sod_qty_ship))
            end net_revenue
			from sod_det a
				join (
				select so_nbr	
					, so_cust
					, so_ord_date
					, so_ship
					, so_bol
					, so_cmtindx
					, so_compl_date
					, so_shipvia
				from so_mstr
				where so_domain = 'EYE'
				AND so_compl_date IS NULL
			) c ON c.so_nbr = a.sod_nbr
				WHERE sod_domain = 'EYE'
                    AND sod_project = ''
					AND sod_qty_ord != sod_qty_ship
					AND a.sod_per_date between '" . $dateFrom . "' AND '" . $dateTo . "'
					AND sod_part != 'DISCOUNT'
				ORDER BY a.sod_due_date ASC
				WITH (nolock)
				
		";
		$query = $this->db->prepare($mainQry);
		$query->execute();
		$results = $query->fetchAll(PDO::FETCH_ASSOC);


		$month = strtotime($weekStart);

        $end = strtotime($weekEnd);

        $typeOf = 'SO_CUST';
        $amount = 'TOTAL';
        $_date = 'DATE1';

        $test = array();
		
        $chart1 = array();
        $chart2 = array();

        $arrayData = [];
        foreach ($results as &$row) {
            $arrayData[] = $row[$typeOf];
        }


        $uniqueArray = array_values(array_unique($arrayData, SORT_REGULAR));

        

        $test22 = array();
        while ($month <= $end) {
            $w = date('W', $month);
            $y = date('Y', $month);


			$obj['label'][] = $w . '-' . $y;
			// $labelCheck = $w . '-' . $y;
			// $ee = "W";
			// $key = $w;


            // $test22[] = date('W m/d/y', $month);
            // $test33[] = $labelCheck;

            // $test[$key] = 0;

            // foreach ($uniqueArray as $vendorSelectedrow) {

            //     $test['test111'][$vendorSelectedrow] = 0;
            //     $test['isFound'][$vendorSelectedrow] = false;

            //     $test['test'][$vendorSelectedrow] = array();
            //     $test['count'][$vendorSelectedrow] = 0;
            //     foreach ($results as $row) {

			// 		$formatedDate = date($ee, strtotime($row[$_date])) . '-' . date('Y', strtotime($row[$_date]));

            //         if ($labelCheck == $formatedDate && $row[$typeOf] == $vendorSelectedrow) {
            //             $test[$key] += $row[$amount];
            //         }

            //         if ($labelCheck == $formatedDate && $row[$typeOf] == $vendorSelectedrow) {
            //             $test['test111'][$vendorSelectedrow] += $row[$amount];
            //             $test['isFound'][$vendorSelectedrow] = true;
            //         }
            //     }
            // }

            // $dd = explode("-", $labelCheck);
            // $dates=$this->getStartAndEndDate($dd[0],$dd[1]);
            

            // $converDate = date("n/j/Y", strtotime($dates['start_date']))  . ' - ' . date("n/j/Y", strtotime($dates['end_date']));
            // $chart2[$converDate] = 0;
            // $chart2["weekAndYear"] = "";


            // foreach ($uniqueArray as $vendorSelectedrow) {

            //     $chart1[$vendorSelectedrow][] = array(
            //         "weekAndYear" => "(" . $w . "-". $y . ") ",
            //         "week" => $converDate,
            //         "end_" =>  date("n/j/Y", strtotime($dates['end_date'])),
            //         "value" => $test['test111'][$vendorSelectedrow],
            //         "customer" => $vendorSelectedrow
            //     );

            //     $chart2[$converDate] += $test['test111'][$vendorSelectedrow];
            //     $chart3["(" . $w . "-". $y . ") "][] = array(
            //         "weekAndYear" => "(" . $w . "-". $y . ") ",
            //         "week" => $converDate,
            //         "end_" =>  date("n/j/Y", strtotime($dates['end_date'])),
            //         "value" => $chart2[$converDate],
            //         "customer" => $vendorSelectedrow
            //     );
            // }

			$month = strtotime("+1 week", $month);
        }

		$begin = new DateTime($weekStart);
$end = new DateTime($weekEnd);

$daterange = new DatePeriod($begin, new DateInterval('P5D'), $end);

$t = array();
foreach($daterange as $date){
    $t[] = $date->format("Y-m-d") . "\n";
}


        return array(
            "chart2" => $chart2,
            "chart1" => $chart1,
            "obj" => $obj,
            "dateFrom" => $dateFrom,
            "dateTo" => $dateTo,
            "test22" => $test22,
            "results" => $results,
            "weekStart" => $weekStart,
            "weekEnd" => $weekEnd,
            "t" => $t,
        );

	}

	public function getFutureRevenueByCustomer($applyAgsDiscount = false)
	{

		$discountMultiplier = $applyAgsDiscount ? '0.91' : '1.0';

		$mainQry = "
                select c.so_cust so_cust
                    , month(a.sod_per_date) month
                    , year(a.sod_per_date) year
                    , sum(
                        case 
                            when (c.so_cust) = 'AMEGAM' then (a.sod_price*(a.sod_qty_ord-a.sod_qty_ship)) * {$discountMultiplier}
                            else (a.sod_price*(a.sod_qty_ord-a.sod_qty_ship))
                        end
                    ) balance
            from sod_det a
                join (
					select so_nbr	
						, so_cust
						, so_ord_date
						, so_ship
						, so_bol
						, so_cmtindx
						, so_compl_date
						, so_shipvia
					from so_mstr
					where so_domain = 'EYE'
					AND so_compl_date IS NULL
				) c ON c.so_nbr = a.sod_nbr
                WHERE sod_domain = 'EYE'
                    AND sod_qty_ord != sod_qty_ship
                    AND sod_project = ''
					AND sod_part != 'DISCOUNT'
                GROUP BY c.so_cust
                    , month(a.sod_per_date)
                    , year(a.sod_per_date)
                ORDER BY a.sod_per_date ASC
                
        ";


		$query = $this->db->prepare($mainQry);
		$query->execute();
		$results = $query->fetchAll(PDO::FETCH_ASSOC);

		$columns = array();
		$customers = array();

		foreach ($results as $row) {
			$columns[] = $row['MONTH'] . "-" . $row['YEAR'];
			$customers[] = array(
				"Customer" => $row['SO_CUST']
			);
		}

		$uniqueColumns = array(
			"openSalesColumns" => array_values(array_unique($columns, SORT_REGULAR)),
			"openSalesDetails" => $results
		);

		$customers = array_values(array_unique($customers, SORT_REGULAR));
		foreach ($customers as &$row) {

			//START OPEN SALES
			foreach ($uniqueColumns['openSalesColumns'] as $key => $value2) {

				$row[$value2] = 0;
			}
		}


		//Put values in there correct cell
		foreach ($customers as $key => $value) {

			$totalOpenSales = 0;
			foreach ($results as &$row) {

				//match by part number
				if ($customers[$key]['Customer'] == $row['SO_CUST']) {
					foreach ($uniqueColumns['openSalesColumns'] as $key1 => $value2) {
						$month = substr($value2, strrpos($value2, '_') + 1);
						//match by month
						if ($value2 == $row['MONTH'] . "-" . $row['YEAR']) {
							$totalOpenSales = $row['BALANCE'] + $totalOpenSales;
							//sum qty
							$customers[$key][$value2] = $row['BALANCE'];
						}
					}
					//sum total
					$customers[$key]['Grand Total'] = $totalOpenSales;
				}
			}
		}

		return $customers;
	}

	// public function getRevenue($dateFrom, $dateTo)
	// {

	// 	$obj = array();
	// 	$dateFrom = date("Y-m-d", strtotime($dateFrom));
	// 	$dateTo = date("Y-m-t", strtotime($dateTo));

	// 	$year_check = date('Y');
	// 	$month_check = date('n');
	// 	$currentMonthName = date('M Y');

	// 	$qry = "
	// 			select month(a.PostingDate) month
	// 				, year(a.PostingDate) year
					
	// 				, sum(case when a.GL_ID = 15774615 then  a.PostingLineCreditLC - a.PostingLineDebitLC else 0 end) Product
	// 				, sum(case when a.GL_ID IN (15774616, 15790482, 15790530) then a.PostingLineCreditLC - a.PostingLineDebitLC else 0 end) ServiceParts
	// 				, sum(case when a.GL_ID = 15774617 then a.PostingLineCreditLC - a.PostingLineDebitLC else 0 end) ServiceStorage
	// 				, sum(case when a.GL_ID = 15774618 then a.PostingLineCreditLC - a.PostingLineDebitLC else 0 end) Kitting
	// 				, sum(case when a.GL_ID = 27413065 then a.PostingLineCreditLC - a.PostingLineDebitLC else 0 end) Graphics
	// 				, sum(a.PostingLineCreditLC) - sum(a.PostingLineDebitLC) total
					
	// 			from PostingLine a
				
	// 			left join (
	// 				select Posting_ID
	// 					, DInvoice_ID
	// 				from DInvoicePosting 
	// 			) b ON b.Posting_ID = a.Posting_ID
				
	// 			where a.GL_ID IN (15774615, 15774616, 15790482, 15790530, 15774617, 15774618, 27413065)
	// 				and a.PostingDate between :dateFrom and :dateTo
	// 			group by month(a.PostingDate), year(a.PostingDate)
	// 			ORDER BY year(a.PostingDate), month(a.PostingDate) asc
	// 		";

	// 	$query = $this->db->prepare($qry);
	// 	$query->bindParam(':dateFrom', $dateFrom, PDO::PARAM_STR);
	// 	$query->bindParam(':dateTo', $dateTo, PDO::PARAM_STR);
	// 	$query->execute();
	// 	$results = $query->fetchAll(PDO::FETCH_ASSOC);

	// 	$objCurrentInfo = new stdClass();

	// 	$obj['currentMonthInfoChart'] = array();
	// 	foreach ($results as $row) {
	// 		if ($row['MONTH'] == $month_check && $row['YEAR'] == $year_check) {
	// 			$row['currentMonthName'] = $currentMonthName;
	// 			$objCurrentInfo = $row;
	// 		}
	// 	}
	// 	$obj['currentMonthInfo'] = $objCurrentInfo;

	// 	$dateFrom_so = date('Y-m-01');
	// 	$dateTo_so = date("Y-m-t", strtotime($dateFrom_so));

	// 	$obj['$dateFrom_so'] = $dateFrom_so;
	// 	$obj['$dateTo_so'] = $dateTo_so;

	// 	$mainQry = "
	// 			select sum((sod_qty_ord-sod_qty_ship)*sod_price) openBalancePrice
	// 				, max(sod_acct) sod_acct
	// 			from sod_det a
	// 			WHERE sod_domain = 'EYE'
	// 				AND sod_qty_ord != sod_qty_ship	
	// 				AND a.sod_nbr NOT LIKE 'SV%'
	// 				AND a.sod_due_date between :dateFrom and :dateTo
	// 				and a.sod_acct in (47000, 47500)
				
	// 		";
	// 	$query = $this->db->prepare($mainQry);
	// 	$query->bindParam(':dateFrom', $dateFrom_so, PDO::PARAM_STR);
	// 	$query->bindParam(':dateTo', $dateTo_so, PDO::PARAM_STR);
	// 	$query->execute();
	// 	$obj['PROJECTED_OPEN'] = $query->fetch(PDO::FETCH_ASSOC);

	// 	$mainQry = "
	// 			select IFNULL(SUM(
	// 				CASE WHEN abs_inv_nbr = '' then abs_ship_qty*a.sod_list_pr else 0 end 
	// 			), 0) shippedNotInvoicedAmount, 
	// 			IFNULL(SUM(
	// 				CASE WHEN abs_inv_nbr != '' then abs_ship_qty*a.sod_list_pr else 0 end 
	// 			), 0) shipped_and_invoiced,
	// 			IFNULL(SUM(abs_ship_qty*a.sod_list_pr
	// 			), 0) totalAmount
	// 			from sod_det a
				
	// 			LEFT join (
	// 				select abs_shipto
	// 					, abs_shp_date
	// 					, abs_item
	// 					, abs_line
	// 					, abs_ship_qty
	// 					, abs_inv_nbr
	// 					, abs_par_id
	// 					, abs_order
	// 					, abs_ship_qty
	// 				from abs_mstr 
	// 				where abs_domain = 'EYE'
	// 			) f ON f.abs_order = a.sod_nbr
	// 				AND f.abs_line = a.sod_line
					
	// 			WHERE sod_domain = 'EYE'
	// 			and abs_shp_date between :dateFrom and :dateTo
	// 			AND f.abs_order NOT LIKE 'SV%'
	// 			AND a.sod_nbr NOT LIKE 'SV%'
	// 		";
	// 	$query = $this->db->prepare($mainQry);
	// 	$query->bindParam(':dateFrom', $dateFrom_so, PDO::PARAM_STR);
	// 	$query->bindParam(':dateTo', $dateTo_so, PDO::PARAM_STR);
	// 	$query->execute();
	// 	$obj['SHIPPED_WITH_INVOICED_AND_NOT_INVOICED'] = $query->fetch(PDO::FETCH_ASSOC);

	// 	$mainQry = "
	// 			select sum(case when a.sod_acct = 47000 then (a.sod_qty_ord-a.sod_qty_ship)*sod_price else 0 end) Product
	// 				, sum(case when a.sod_acct = 47500 then (a.sod_qty_ord-a.sod_qty_ship)*sod_price else 0 end) Graphics
	// 				, max(month(a.sod_due_date)) month
	// 				, max(year(a.sod_due_date)) year
	// 			from sod_det a
	// 			WHERE sod_domain = 'EYE'
	// 				AND a.sod_nbr NOT LIKE 'SV%'
	// 				AND sod_qty_ord != sod_qty_ship	
	// 				AND a.sod_due_date between :dateFrom and :dateTo
				
	// 		";
	// 	$query = $this->db->prepare($mainQry);
	// 	$query->bindParam(':dateFrom', $dateFrom_so, PDO::PARAM_STR);
	// 	$query->bindParam(':dateTo', $dateTo_so, PDO::PARAM_STR);
	// 	$query->execute();
	// 	$results_projected = $query->fetch();
	// 	$obj['results_projected'] = $results_projected;

	// 	$obj['PROJECTED'] = 0;
	// 	$nowDate = $_GET['dateTo'];
	// 	$start = $month = strtotime($_GET['dateFrom']);
	// 	$end = strtotime($nowDate);

	// 	while ($month < $end) {

	// 		$month = strtotime("+1 month", $month);

	// 		$m = date('m', $month);
	// 		$y = date('Y', $month);
	// 		$label = getMonthName($m) . " - " . $y;

	// 		$obj['MONTH'][] = $label;


	// 		$PRODUCT = 0;
	// 		$SERVICEPARTS = 0;
	// 		$SERVICESTORAGE = 0;
	// 		$KITTING = 0;
	// 		$GRAPHICS = 0;


	// 		foreach ($results as $row) {
	// 			$resultsFound = true;

	// 			$ll = getMonthName($row['MONTH']) . " - " . $row['YEAR'];
	// 			if ($label == $ll) {
	// 				$PRODUCT += $row['PRODUCT'];
	// 				$SERVICEPARTS += $row['SERVICEPARTS'];
	// 				$SERVICESTORAGE += $row['SERVICESTORAGE'];
	// 				$KITTING += $row['KITTING'];
	// 				$GRAPHICS += $row['GRAPHICS'];
	// 				$obj['Results'][] = $row;
	// 			}
	// 		}

	// 		$obj['PRODUCT'][] = $PRODUCT;
	// 		$obj['SERVICEPARTS'][] = $SERVICEPARTS;
	// 		$obj['SERVICESTORAGE'][] = $SERVICESTORAGE;
	// 		$obj['KITTING'][] = $KITTING;
	// 		$obj['GRAPHICS'][] = $GRAPHICS;
	// 		$obj['TOTAL'][] = $GRAPHICS;

	// 		if ($results_projected['MONTH'] == $m && $results_projected['YEAR'] == $y) {
	// 			$obj['PROJECTED_PRODUCT'][] = $results_projected['PRODUCT'];
	// 			$obj['PROJECTED_GRAPHICS'][] = $results_projected['GRAPHICS'];
	// 			$obj['PROJECTED_PRODUCT_ALL'] = $results_projected['PRODUCT'];
	// 			$obj['PROJECTED_GRAPHICS_ALL'] = $results_projected['GRAPHICS'];
	// 		} else {
	// 			$obj['PROJECTED_PRODUCT'][] = 0;
	// 			$obj['PROJECTED_GRAPHICS'][] = 0;
	// 			$obj['PROJECTED_PRODUCT_ALL'] = 0;
	// 			$obj['PROJECTED_GRAPHICS_ALL'] = 0;
	// 		}
	// 	}

		
	// 	$obj['testresults'] = $results;

	// 	$obj['PROJECTED'] = $results_projected['PRODUCT'] + $results_projected['GRAPHICS'] +
	// 		$obj['SHIPPED_WITH_INVOICED_AND_NOT_INVOICED']['SHIPPEDNOTINVOICEDAMOUNT'] + $obj['SHIPPED_WITH_INVOICED_AND_NOT_INVOICED']['SHIPPED_AND_INVOICED'];

	// 	return $obj;
	// }

	// public function getRevenueDetails1($dateFrom = "2021-01-01", $dateTo = "2021-12-31")
	// {
	// 	$qry = "
    //         select month(a.PostingDate) month
    //             , year(a.PostingDate) year
    //             , a.PostingDate date1
    //             , case 
    //             when a.GL_ID = 15774615 THEN 'Product'
    //             when a.GL_ID IN (15774616, 15790482, 15790530) THEN 'ServiceParts'
    //             when a.GL_ID = 15774617 THEN 'ServiceStorage'
    //             when a.GL_ID = 15774618 THEN 'Kitting'
    //             when a.GL_ID = 15774618 THEN 'Graphics'
    //             else 'Others'
    //             END glType
    //             , sum(a.PostingLineCreditLC) - sum(a.PostingLineDebitLC) total
    //         from PostingLine a
            
    //         left join (
    //             select Posting_ID
    //                 , DInvoice_ID
    //             from DInvoicePosting 
    //         ) b ON b.Posting_ID = a.Posting_ID
            
    //         where a.GL_ID IN (15774615, 15774616, 15790482, 15790530, 15774617, 15774618, 27413065)
    //             and a.PostingDate between :dateFrom and :dateTo
    //         group by a.PostingDate, case 
    //         when a.GL_ID = 15774615 THEN 'Product'
    //         when a.GL_ID IN (15774616, 15790482, 15790530) THEN 'ServiceParts'
    //         when a.GL_ID = 15774617 THEN 'ServiceStorage'
    //         when a.GL_ID = 15774618 THEN 'Kitting'
    //         when a.GL_ID = 15774618 THEN 'Graphics'
    //         else 'Others'
    //         END
    //         ORDER BY year(a.PostingDate), month(a.PostingDate) asc
    //     ";

	// 	$query = $this->db->prepare($qry);
	// 	$query->bindParam(':dateFrom', $dateFrom, PDO::PARAM_STR);
	// 	$query->bindParam(':dateTo', $dateTo, PDO::PARAM_STR);
	// 	$query->execute();
	// 	return $query->fetchAll(PDO::FETCH_ASSOC);
	// }

	// public function open($dateFrom, $dateTo)
	// {
	// 	$mainQry = "
	// 			select sum((sod_qty_ord-sod_qty_ship)*sod_price) price 
	// 			, sod_due_date daten  
	// 			, MONTH(sod_due_date) month 
	// 			, YEAR(sod_due_date) YEAR
	// 		, 'open' typeOf 
	// 		from sod_det a 
	// 		WHERE sod_domain = 'EYE' 
	// 			AND sod_qty_ord != sod_qty_ship	 
	// 			AND a.sod_due_date between :dateFrom and '2022-01-31' 
	// 		GROUP By sod_due_date, MONTH(sod_due_date), YEAR(sod_due_date)
	// 		UNION ALL  
	// 			select sum(abs_ship_qty*sod_price) price 
	// 			, abs_shp_date daten  
	// 			, MONTH(abs_shp_date) month 
	// 			, YEAR(abs_shp_date) YEAR 
	// 		, 'shipped' typeOf 
	// 			from abs_mstr a 
	// 			left join ( 
	// 				select sod_price 
	// 					, sod_line 
	// 					, sod_nbr 
	// 				from sod_det a 
	// 				WHERE sod_domain = 'EYE' 
	// 			) b ON b.sod_nbr = a.abs_order AND b.sod_line = a.abs_line 
	// 			where abs_domain = 'EYE' 
	// 			AND a.abs_shp_date between '2021-01-01' and '2022-01-31' 
	// 		GROUP BY abs_shp_date , MONTH(abs_shp_date), YEAR(abs_shp_date) 
			 
	// 	";
	// 	$query = $this->db->prepare($mainQry);
	// 	$query->bindParam(':dateFrom', $dateFrom, PDO::PARAM_STR);
	// 	$query->bindParam(':dateTo', $dateTo, PDO::PARAM_STR);
	// 	$query->bindParam(':dateFrom1', $dateFrom, PDO::PARAM_STR);
	// 	$query->bindParam(':dateTo1', $dateTo, PDO::PARAM_STR);
	// 	$query->execute();
	// 	return $query->fetch(PDO::FETCH_ASSOC);
	// }

	// public function run($dateFrom = "2018-01-01", $dateTo = "2022-02-31", $typeOfView = 'Monthly')
	// {
	// 	$results = $this->getRevenueDetails1($dateFrom, $dateTo);
	// 	return $openAndShipped = $this->open($dateFrom, $dateTo);

	// 	$month = strtotime($dateFrom);
	// 	$end = strtotime($dateTo);

	// 	$typeOf = 'GLTYPE';
	// 	$amount = 'TOTAL';
	// 	$_date = 'DATE1';

	// 	$test = array();
	// 	$chart = array();
	// 	$chart1 = array();

	// 	$goal = 200000.00;

	// 	$arrayData = [];
	// 	foreach ($results as $row) {
	// 		$arrayData[] = $row[$typeOf];
	// 	}

	// 	$colors = ['#85144b', '#001f3f', '#3D9970', '#39CCCC', '#FF851B', '#7FDBFF'];

	// 	$uniqueArray = array_values(array_unique($arrayData, SORT_REGULAR));

	// 	while ($month <= $end) {
	// 		$w = date('W', $month);
	// 		$y = date('Y', $month);
	// 		$m = date('M', $month);
	// 		$d = date('m/d/y', $month);

	// 		$yearQuarterSet = date("n", $month);
	// 		$yearQuarter = ceil($yearQuarterSet / 3);

	// 		if ($typeOfView == 'Weekly') {
	// 			$obj['label'][] = $w . '-' . $y;
	// 			$labelCheck = $w . '-' . $y;
	// 			$ee = "W";
	// 			$key = $w;
	// 			$goal1 = $goal * 5;
	// 		} else if ($typeOfView == 'Monthly') {
	// 			$obj['label'][] = $m . '-' . $y;
	// 			$labelCheck = $m . '-' . $y;
	// 			$ee = "M";
	// 			$key = $m;
	// 			$goal1 = $goal * 31;
	// 		} else if ($typeOfView == 'Annually') {
	// 			$obj['label'][] = $y;
	// 			$labelCheck =  $y;
	// 			$ee = "Y";
	// 			$key = $y;
	// 			$goal1 = $goal * 365;
	// 		} else if ($typeOfView == 'Daily') {
	// 			$obj['label'][] = $d;
	// 			$labelCheck =  $d . '-' . $y;
	// 			$ee = "m/d/y";
	// 			$key = $d;
	// 			$goal1 = $goal;
	// 		} else if ($typeOfView == 'Quarterly') {
	// 			$obj['label'][] = "Qtr:" . $yearQuarter . '-' . $y;
	// 			$labelCheck =  $yearQuarter . '-' . $y;
	// 			$ee = "m/d/y";
	// 			$key = $yearQuarter . '-' . $y;
	// 			$goal1 = $goal * 90;
	// 		}


	// 		$calculateGoal = $goal1;

	// 		$test[$key] = 0;

	// 		foreach ($uniqueArray as $vendorSelectedrow) {

	// 			$test['test111'][$vendorSelectedrow] = 0;
	// 			$test['isFound'][$vendorSelectedrow] = false;

	// 			$test['test'][$vendorSelectedrow] = array();
	// 			$test['count'][$vendorSelectedrow] = 0;
	// 			foreach ($results as $row) {

	// 				if ($typeOfView == 'Quarterly') {
	// 					$yearQuarterSet1 = date("n", strtotime($row[$_date]));
	// 					$formatedDate = ceil($yearQuarterSet1 / 3) . '-' . date('Y', strtotime($row[$_date]));
	// 				} else if ($typeOfView == 'Annually') {
	// 					$formatedDate = date('Y', strtotime($row[$_date]));
	// 				} else {
	// 					$formatedDate = date($ee, strtotime($row[$_date])) . '-' . date('Y', strtotime($row[$_date]));
	// 				}

	// 				if ($labelCheck == $formatedDate && $row[$typeOf] == $vendorSelectedrow) {
	// 					$test[$key] += $row[$amount];
	// 				}

	// 				if ($labelCheck == $formatedDate && $row[$typeOf] == $vendorSelectedrow) {
	// 					$test['test111'][$vendorSelectedrow] += $row[$amount];
	// 					$test['isFound'][$vendorSelectedrow] = true;
	// 				}
	// 			}
	// 		}

	// 		$color_index = 0;
	// 		foreach ($uniqueArray as $vendorSelectedrow) {
	// 			$chart1[$vendorSelectedrow]['dataset'][] = $test['test111'][$vendorSelectedrow];
	// 			$chart1[$vendorSelectedrow]['label'] = $vendorSelectedrow;
	// 			$chart1[$vendorSelectedrow]['backgroundColor'] = $colors[$color_index];
	// 			$color_index++;
	// 		}


	// 		if ($typeOfView == 'Weekly') {
	// 			$month = strtotime("+1 week", $month);
	// 		} else if ($typeOfView == 'Monthly') {
	// 			$month = strtotime("+1 month", $month);
	// 		} else if ($typeOfView == 'Annually') {
	// 			$month = strtotime("+1 year", $month);
	// 		} else if ($typeOfView == 'Daily') {
	// 			$month = strtotime("+1 day", $month);
	// 		} else if ($typeOfView == 'Quarterly') {
	// 			$month = strtotime("+3 month", $month);
	// 		}
	// 	}

	// 	return array(
	// 		"label" => $obj['label'],
	// 		"chart" => $chart1,
	// 	);
	// }



	public function getRevenueAll($dateFrom = "2021-01-01", $dateTo = "2021-12-31")
	{

		$qry = "
            select price, daten, month, year, RTRIM (tyoeOf) tyoeOf 
            from (
				
				select sum(a.PostingLineCreditLC - a.PostingLineDebitLC) price 
					, PostingDate daten  
					, month(PostingDate) month  
							, year(PostingDate) YEAR  
					, case 
						when a.GL_ID = 15774615 THEN 'Product'
						when a.GL_ID = 15774617 THEN 'Service Storage'
						when a.GL_ID IN (15774616, 15790482, 15790530) THEN 'Service Parts'
						when a.GL_ID = 15774618 THEN 'Kitting'
						else 'Graphics'
						END tyoeOf   
							
							
						from PostingLine a   
						
						left join (  
							select Posting_ID  
								, DInvoice_ID  
							from DInvoicePosting   
						) b ON b.Posting_ID = a.Posting_ID 
						
						where a.gl_id IN (15774615, 15774616, 15790482, 15790530, 15774617, 15774618, 27413065) 
						and  PostingDate <> '2022-12-31'
						group by PostingDate, month(PostingDate), year(PostingDate), tyoeOf 
				
						UNION ALL  
							select sum((sod_qty_ord-sod_qty_ship)*sod_price) price    
							, sod_due_date daten    
								, MONTH(sod_due_date) month   
								, YEAR(sod_due_date) YEAR   
								, case when sod_qty_ord != sod_qty_ship THEN 'Open' ELSE 'total_shipped' END tyoeOf      
							from sod_det a   
							WHERE sod_domain = 'EYE'   
								AND sod_qty_ord != sod_qty_ship 
							GROUP By sod_due_date, MONTH(sod_due_date), YEAR(sod_due_date), tyoeOf  
							UNION ALL
								select sum(abs_ship_qty*sod_price) price   
								, abs_shp_date daten   
								, MONTH(abs_shp_date) month 
								, YEAR(abs_shp_date) YEAR 
							, case when abs_inv_nbr != '' THEN 'invoiced_amount' ELSE 'Pending Invoice' END tyoeOf   
                            from abs_mstr a 
                            left join ( 
                                select sod_price 
                                    , sod_line 
                                    , sod_nbr 
									, sod_acct
                                from sod_det a 
                                WHERE sod_domain = 'EYE' 
								and sod_domain = 'EYE' 
                            ) b ON b.sod_nbr = a.abs_order AND b.sod_line = a.abs_line 
                            where abs_domain = 'EYE' 
							and abs_inv_nbr = ''
                        GROUP BY abs_shp_date , MONTH(abs_shp_date), YEAR(abs_shp_date), tyoeOf 
            ) a 
			where daten between :dateFrom and :dateTo OR 
				( MONTH(daten) = MONTH(curDate()) AND YEAR(daten) = YEAR(curDate()) )
			ORDER BY case 
				when tyoeOf = 'Product' THEN 1
				when tyoeOf = 'Service Storage' THEN 2
				when tyoeOf = 'Service Parts' THEN 3
				when tyoeOf = 'Kitting' THEN 4
				when tyoeOf = 'Graphics' THEN 5
				when tyoeOf = 'Pending Invoice' THEN 6
				when tyoeOf = 'Open' THEN 7
				END ASC
			 
        ";

		$query = $this->db->prepare($qry);
		$query->bindParam(':dateFrom', $dateFrom, PDO::PARAM_STR);
		$query->bindParam(':dateTo', $dateTo, PDO::PARAM_STR);
		$query->execute();
		return $query->fetchAll(PDO::FETCH_ASSOC);
	}


	public function getRevenuePrevious($dateFrom = "2021-01-01", $dateTo = "2021-12-31")
	{
		$qry = "
		select sum(a.PostingLineCreditLC - a.PostingLineDebitLC) price 
				, month(PostingDate) month  
				, year(PostingDate) YEAR 
				, PostingDate
			from PostingLine a   
			
			left join (  
				select Posting_ID  
					, DInvoice_ID  
				from DInvoicePosting   
			) b ON b.Posting_ID = a.Posting_ID 
			
			where a.gl_id IN (15774615, 15774616, 15790482, 15790530, 15774617, 15774618, 27413065) 
			and PostingDate between '2021-01-01' AND '2021-12-31'
			group by month(PostingDate), year(PostingDate), PostingDate
			
			 
        ";

		$query = $this->db->prepare($qry);
		$query->bindParam(':dateFrom', $dateFrom, PDO::PARAM_STR);
		$query->bindParam(':dateTo', $dateTo, PDO::PARAM_STR);
		$query->execute();
		return $query->fetchAll(PDO::FETCH_ASSOC);
	}

	public function runTest($dateFrom, $dateTo, $typeOfView)
	{
		$results = $this->getRevenueAll($dateFrom, $dateTo);
		// if ($typeOfView == 'Monthly') {
		//     $getRevenuePrevious = $this->getRevenuePrevious($dateFrom, $dateTo);
		// }


		$month = strtotime($dateFrom);
		$end = strtotime($dateTo);


		$nowDate = date("Y-m-d", time());

		$_y = date('Y');
		$_m = date('m');


		$typeOf = 'TYOEOF';
		$amount = 'PRICE';
		$_date = 'DATEN';

		$test = array();
		$chart1 = array();

		$goal = 200000.00;

		$arrayData = [];

		$overall = new stdClass();
		$overall->projected = 0;
		$overall->open = 0;
		$overall->currentRevenue = 0;
		$overall->pendingInvoice = 0;
		$overall->Graphics = 0;
		$overall->Kitting = 0;
		$overall->Product = 0;
		$overall->serviceParts = 0;
		$overall->serviceStorage = 0;

		foreach ($results as $row) {
			$arrayData[] = $row[$typeOf];
			if ($_y == $row['YEAR'] && $_m == $row['MONTH']) {
				$overall->projected += $row['PRICE'];

				if ($row['TYOEOF'] == 'Open') {
					$overall->open += $row['PRICE'];
				}
				if ($row['TYOEOF'] == 'Pending Invoice') {
					$overall->pendingInvoice += $row['PRICE'];
				}
				if (
					$row['TYOEOF'] == 'Graphics' ||
					$row['TYOEOF'] == 'Kitting' ||
					$row['TYOEOF'] == 'Product' ||
					$row['TYOEOF'] == 'Service Parts' ||
					$row['TYOEOF'] == 'Service Storage'
				) {
					$overall->currentRevenue += $row['PRICE'];
				}
				if (
					$row['TYOEOF'] == 'Graphics'
				) {
					$overall->Graphics += $row['PRICE'];
				}
				if (
					$row['TYOEOF'] == 'Kitting'
				) {
					$overall->Kitting += $row['PRICE'];
				}
				if (
					$row['TYOEOF'] == 'Product'
				) {
					$overall->Product += $row['PRICE'];
				}
				if (
					$row['TYOEOF'] == 'Service Parts'
				) {
					$overall->serviceParts += $row['PRICE'];
				}
				if (
					$row['TYOEOF'] == 'Service Storage'
				) {
					$overall->serviceStorage += $row['PRICE'];
				}
			}
		}

		$colors = ['#009B77', '#A52A2A', '#B8860B', '#39CCCC', '#FF851B', '#B565A7', '#E0E0E0'];

		$uniqueArray = array_values(array_unique($arrayData, SORT_REGULAR));


		$w = date('W', $month);
		$y = date('Y', $month);
		$m = date('M', $month);
		$d = date('m/d/y', $month);

		$yearQuarterSet = date("n", $month);
		$yearQuarter = ceil($yearQuarterSet / 3);

		if ($typeOfView == 'Quarterly') {
			$yearQuarterSet1 = date("n", strtotime($nowDate));
			$formatedDatea = ceil($yearQuarterSet1 / 3) . '-' . date('Y', strtotime($nowDate));
		} else if ($typeOfView == 'Annually') {
			$formatedDatea = date('Y', strtotime($nowDate));
		} else if ($typeOfView == 'Weekly') {
			$formatedDatea = date('W', strtotime($nowDate)) . '-' . date('Y', strtotime($nowDate));
		} else if ($typeOfView == 'Monthly') {
			$formatedDatea = date('M', strtotime($nowDate)) . '-' . date('Y', strtotime($nowDate));
		} else if ($typeOfView == 'Daily') {
			$formatedDatea = date('m/d/y', strtotime($nowDate)) . '-' . date('Y', strtotime($nowDate));
		}

		while ($month <= $end) {
			$w = date('W', $month);
			$y = date('Y', $month);
			$m = date('M', $month);
			$mm = date('m', $month);
			$d = date('m/d/y', $month);

			$yearQuarterSet = date("n", $month);
			$yearQuarter = ceil($yearQuarterSet / 3);

			if ($typeOfView == 'Weekly') {
				$obj['label'][] = $w . '-' . $y;
				$labelCheck = $w . '-' . $y;
				$ee = "W";
				$key = $w;
			} else if ($typeOfView == 'Monthly') {
				$obj['label'][] = $m . '-' . $y;
				$labelCheck = $m . '-' . $y;
				$ee = "M";
				$key = $m;
			} else if ($typeOfView == 'Annually') {
				$obj['label'][] = $y;
				$labelCheck =  $y;
				$ee = "Y";
				$key = $y;
			} else if ($typeOfView == 'Daily') {
				$obj['label'][] = $d;
				$labelCheck =  $d . '-' . $y;
				$ee = "m/d/y";
				$key = $d;
			} else if ($typeOfView == 'Quarterly') {
				$obj['label'][] = "Qtr:" . $yearQuarter . '-' . $y;
				$labelCheck =  $yearQuarter . '-' . $y;
				$ee = "m/d/y";
				$key = $yearQuarter . '-' . $y;
			}


			$test[$key] = 0;

			// if ($typeOfView == 'Monthly') {
			//     $test1[$mm] = 0;

			//     foreach ($getRevenuePrevious as $getRevenuePreviousrow) {
			//         $formatedDate = date("m", strtotime($getRevenuePreviousrow['PostingDate']));

			//         if ($formatedDate == $mm) {
			//             $test1[$mm] += $getRevenuePreviousrow['PRICE'];
			//         }
			//     }


			//     $chart1['previous']['dataset'][] = $test1[$mm];
			//     $chart1['previous']['label'] = "previous";
			//     $chart1['previous']['type'] = "line";
			// }

			$color_index = 0;



			foreach ($uniqueArray as $vendorSelectedrow) {

				$test['test111'][$vendorSelectedrow] = 0;
				$test['borderColor'][$vendorSelectedrow] = "";
				$test['isFound'][$vendorSelectedrow] = false;

				$test['test'][$vendorSelectedrow] = [];
				$test['count'][$vendorSelectedrow] = 0;



				foreach ($results as $row) {

					if ($typeOfView == 'Quarterly') {
						$yearQuarterSet1 = date("n", strtotime($row[$_date]));
						$formatedDate = ceil($yearQuarterSet1 / 3) . '-' . date('Y', strtotime($row[$_date]));
					} else if ($typeOfView == 'Annually') {
						$formatedDate = date('Y', strtotime($row[$_date]));
					} else {
						$formatedDate = date($ee, strtotime($row[$_date])) . '-' . date('Y', strtotime($row[$_date]));
					}

					if ($labelCheck == $formatedDate && $row[$typeOf] == $vendorSelectedrow) {
						$test[$key] += $row[$amount];
					}

					if ($labelCheck == $formatedDate && $row[$typeOf] == $vendorSelectedrow) {
						$test['test111'][$vendorSelectedrow] += $row[$amount];
						$test['isFound'][$vendorSelectedrow] = true;
					}

					if ($formatedDatea == $labelCheck) {
						$test['borderColor'][$vendorSelectedrow] = "rgb(131, 152, 222)";
					}

					//year
				}

				$chart1[$vendorSelectedrow]['dataset'][] = $test['test111'][$vendorSelectedrow];
				$chart1[$vendorSelectedrow]['label'] = $vendorSelectedrow;
				$chart1[$vendorSelectedrow]['backgroundColor'] = $colors[$color_index];
				$chart1[$vendorSelectedrow]['borderColor'][] = $test['borderColor'][$vendorSelectedrow];
				$color_index++;
			}

			if ($typeOfView == 'Weekly') {
				$month = strtotime("+1 week", $month);
			} else if ($typeOfView == 'Monthly') {
				$month = strtotime("+1 month", $month);
			} else if ($typeOfView == 'Annually') {
				$month = strtotime("+1 year", $month);
			} else if ($typeOfView == 'Daily') {
				$month = strtotime("+1 day", $month);
			} else if ($typeOfView == 'Quarterly') {
				$month = strtotime("+3 month", $month);
			}
		}

		return array(
			"label" => $obj['label'],
			"chart" => $chart1,
			"results" => $results,
			"overall" => $overall
		);
	}

	public function running($dateFrom, $dateTo, $typeOfView)
	{

		return array(
			"chartData" => $this->runTest($dateFrom, $dateTo, $typeOfView)
		);
	}

	public function __destruct()
	{
		$this->db = null;
	}
}
