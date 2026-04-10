<?php

	class ItemAgingReport
	{
	 
		protected $db;
	 
		public function __construct($dbQad)
		{
			
			$this->db = $dbQad;
			
		}			
	  
		public function ReadAll()
		{
			
			$current_date = date("Y-m-d");

			$final_date = date("Y-m-d", strtotime($current_date." -12 months"));
			$final_date1 = date("Y-m-d", strtotime($current_date." -6 months"));
			$final_date2 = date("Y-m-d", strtotime($current_date." -3 months"));

			$mainQry = "
				select b.tr_part tr_part
					, IFNULL(cast(b.qtyChange as numeric(36,1)), 0) qtyChange
					, CONCAT(pt_desc1, pt_desc2) fullDesc
					, d.sct_cst_tot pt_price
					, in_qty_oh in_qty_oh
					, in_qty_oh*d.sct_cst_tot totalCost
					, a.in_part in_part
					, b.totalHits
					, b.totalHitsSlowMovement
					, b.totalLast3
					, b.total12 total12
					, c.pt_abc pt_abc
					, e.pl_desc pl_desc
					, c.pt_part_type pt_part_type
				from in_mstr a 
				left join ( 
					select tr_part 
						, sum(tr_qty_chg) qtyChange 
						, SUM(CASE WHEN tr_date between  '" . $final_date1 . "' and curdate() THEN tr_qty_chg ELSE 0 END) totalHits
						, SUM(CASE WHEN tr_date between  '" . $final_date . "' and '" . $final_date1 . "' THEN tr_qty_chg ELSE 0 END) totalHitsSlowMovement
						, SUM(CASE WHEN tr_date between  '" . $final_date2 . "' and curdate() THEN tr_qty_chg ELSE 0 END) totalLast3
						, sum(CASE WHEN tr_part IS NOT NULL THEN tr_qty_chg ELSE 0 END) total12
					from tr_hist  
					where tr_domain = 'EYE' 
						AND tr_type IN ('ISS-SO', 'ISS-WO') 
						AND tr_date between  '" . $final_date . "' and curdate()
					GROUP BY tr_part
				) b ON b.tr_part = a.in_part 
				
				LEFT JOIN ( 
					select pt_part
						, max(pt_desc1) pt_desc1
						, max(pt_desc2) pt_desc2
						, max(pt_abc) pt_abc
						, max(pt_prod_line) pt_prod_line
						, max(pt_part_type) pt_part_type
					from pt_mstr
					WHERE pt_domain = 'EYE'
					and pt_site = 'EYE01'
					group by pt_part
				) c ON c.pt_part = a.in_part
				
				LEFT JOIN ( 
					select sct_part
						, max(sct_cst_tot) sct_cst_tot
					from sct_det
					WHERE sct_sim = 'Standard' 
						and sct_domain = 'EYE' 
						and sct_site  = 'EYE01'
					group by sct_part
				) d ON a.in_part = d.sct_part 

				LEFT JOIN (
                    select pl_prod_line
                        , pl_desc
                    FROM pl_mstr a 
                    WHERE pl_domain = 'EYE' 
                        AND pl_prod_line != ''
                ) e ON e.pl_prod_line = c.pt_prod_line
				
				where in_domain = 'EYE'
				and in_site	 = 'EYE01'
				WITH (NOLOCK) 
			";
			
			$query = $this->db->prepare($mainQry);
			$query->execute();
			$result = $query->fetchAll(); 
			
			$obj = array();
			$totals['TOTALCOSTLAST6GrandTotal'] = 0;
			$totals['TOTALCOSTLAST6To12GrandTotal'] = 0;
			$totals['TOTALLAST3'] = 0;
			
			foreach($result as $row){ 
			
				$row['PT_PRICE'] = (float)number_format((float)$row['PT_PRICE'], 2, '.', '');
				$row['TOTAL12'] = is_null($row['TOTAL12']) ? 0 : $row['TOTAL12'];
				$row['SLOWMOVEMENT'] = "";
				$row['TOTALCOST'] = (int)$row['IN_QTY_OH']*$row['PT_PRICE'];
				$row['IN_QTY_OH'] = (int)$row['IN_QTY_OH'];
				$row['TOTALHITS'] = (int)$row['TOTALHITS'];
				$row['TOTALLAST3'] = (int)$row['TOTALLAST3'];
				
				$row['TOTALHITSSLOWMOVEMENT'] = (int)$row['TOTALHITSSLOWMOVEMENT'];
				
				if($row['TOTALHITS'] == 0){
					$row['TOTALCOSTLAST6'] = (int)$row['IN_QTY_OH']*$row['PT_PRICE'];
					$totals['TOTALCOSTLAST6GrandTotal'] = $totals['TOTALCOSTLAST6GrandTotal']+$row['TOTALCOSTLAST6'];
				}
				
				if($row['TOTALHITSSLOWMOVEMENT'] <= 3 && $row['TOTALHITSSLOWMOVEMENT'] != 0){
					$row['TOTALCOSTLAST6To12'] = (int)$row['IN_QTY_OH']*$row['PT_PRICE'];
					$totals['TOTALCOSTLAST6To12GrandTotal'] = $totals['TOTALCOSTLAST6To12GrandTotal']+$row['TOTALCOSTLAST6To12'];
				}
				
				if($row['TOTALLAST3'] == 0){
					$row['TOTALLAST3COUNT'] = (int)$row['IN_QTY_OH']*$row['PT_PRICE'];
					$totals['TOTALLAST3'] = $totals['TOTALLAST3']+$row['TOTALLAST3COUNT'];
				}
				
				$obj[] = $row;
			} 
			
			return $o = array(
				'details' => $obj
				, 'totals' => $totals
				, 'current_date' => $current_date
				, 'last6months' => $final_date . " to " . $final_date1
				, 'first6months' => $final_date1 . " to " . $current_date
				, 'first3months' => $final_date2 . " to " . $current_date
			);
			
		}
	}
	 
		