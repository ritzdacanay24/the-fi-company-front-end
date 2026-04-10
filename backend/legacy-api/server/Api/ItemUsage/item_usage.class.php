<?php

class ItemUsage
{

	protected $db;

	public function __construct($dbQad)
	{

		$this->db = $dbQad;
		$this->nowDate = date("Y-m-d");
	}

	public function getInventoryValuationNoIntAndNoJaxing($site)
	{
		
		if($site == 'All'){
			$qry = "
				select pt_part
					, in_avg_iss
					, pt_abc
					, sct_cst_tot 
					, inventory_turns			
					, average_usage_value
					, cp_cust
					, pt_status
					, pt_sfty_stk
					, pt_price
					, pt_part_type
					, onHandQty
					, oh_value
					, openPoQty
					, openpoqtycount
					, last_due_date
					, orderedQty
					, full_desc
					, pt_added
					, pt_avg_int
					, pl_desc
					, pl_inv_acct
					, open_balance
					, total_lines
					, wod_qty_open
					, sct_cst_tot
					, pt_iss_pol
					, pt_buyer
					, pt_pm_code
					, pt_um
					, pl_prod_line
					, is_coi
					, in_iss_date
				from(
					select a.pt_part
						, in_avg_iss
						, in_avg_iss*sct_cst_tot in_avg_iss_value
						, pt_abc
						, cp_cust
						, pt_status
						, pt_sfty_stk
						, pt_price
						, pt_part_type
						, sct_cst_tot
						, CAST(case when onHandQty*sct_cst_tot > 0 THEN ((in_avg_iss*sct_cst_tot)/(onHandQty*sct_cst_tot))*365 ELSE 0 END AS DECIMAL(16,1))  inventory_turns
						, (in_avg_iss*sct_cst_tot) average_usage_value
						, onHandQty
						, openPoQty
						, openpoqtycount
						, last_due_date
						, orderedQty
						, pt_desc1 || ' ' || pt_desc2 full_desc
						, pt_added
						, pt_avg_int
						, pl_desc
						, pl_inv_acct
						, open_balance
						, total_lines
						, wod_qty_open
						, case when pt_iss_pol = 1 THEN 'Yes' ELSE 'No' END pt_iss_pol
						, pt_buyer
						, pt_pm_code
						, pt_um
						, onHandQty*sct_cst_tot oh_value
						, pl_prod_line
						, b.in_iss_date
						, case when (
							RIGHT(a.pt_part, 1) != 'U' AND RIGHT(a.pt_part, 1) != 'R' AND RIGHT(a.pt_part, 1) != 'N' 
						) THEN '-' ELSE 'COI' END is_coi
					from pt_mstr a

					left join (
						select in_part, 
							max(in_avg_iss) in_avg_iss,
							max(in_iss_date) in_iss_date
						from in_mstr 
						where in_domain = 'EYE' 
							and in_site = 'EYE01'
						group by in_part
					) b ON b.in_part = a.pt_part 
					
					LEFT JOIN ( 
						select sct_part 
							, max(sct_cst_tot) sct_cst_tot 
						from sct_det 
						WHERE sct_sim = 'Standard' 
							and sct_domain = 'EYE' 
							and sct_site  = 'EYE01'
						group by sct_part
					) d ON CAST(a.pt_part AS CHAR(25)) = d.sct_part  

					LEFT JOIN (
						select max(cp_cust) cp_cust
							, cp_part 
						from cp_mstr 
						where cp_domain = 'EYE'
						group by cp_part
					) cust ON cust.cp_part = a.pt_part

					LEFT JOIN (
						select a.ld_part
							, sum(ld_qty_oh) onHandQty
						from ld_det a 
						where a.ld_domain = 'EYE' 
						and a.ld_qty_oh > 0
						GROUP BY a.ld_part
					) c ON c.ld_part = a.pt_part

					LEFT JOIN (
						select pod_part
							, sum((pod_qty_ord)*pod_std_cost) orderedQty
							, sum(case WHEN a.pod_status != 'c' THEN ((pod_qty_ord-pod_qty_rcvd)*pod_std_cost) ELSE 0 END) openPoQty
							, sum(case WHEN a.pod_status != 'c' THEN pod_qty_ord-pod_qty_rcvd ELSE 0 END) openpoqtycount
							, max(case WHEN a.pod_status = 'c' THEN pod_due_date END ) last_due_date
						from pod_det a
						where a.pod_domain = 'EYE'
						GROUP BY pod_part
					) e ON e.pod_part = a.pt_part

					left join (
						select max(pl_prod_line) pl_prod_line
							, max(pl_inv_acct) pl_inv_acct
							, pl_desc pl_desc
						FROM pl_mstr a 
						WHERE pl_domain = 'EYE' 
							AND pl_prod_line != ''
							group by pl_desc
					) pl ON pl.pl_prod_line = a.pt_prod_line

					LEFT JOIN (
						select count(case when wod_qty_req-wod_qty_iss = 0 then 1 ELSE 0 END) wod_qty_open
							, wod_part
						from wod_det a
						JOIN wo_mstr b ON a.wod_nbr = b.wo_nbr and wo_domain = 'EYE' and wo_due_date > '2019-07-01' and wo_status != 'c'
						WHERE wod_domain = 'EYE'
							AND wod_qty_req != wod_qty_iss
							and wod_status != 'c'
						GROUP BY wod_part
					) g ON g.wod_part = a.pt_part

					LEFT JOIN (
						SELECT sod_part, sum((sod_qty_ord-sod_qty_ship)*sod_price) open_balance, count(sod_part) total_lines
						from sod_det 
						where sod_domain = 'EYE'
						and sod_qty_ord-sod_qty_ship > 0
						GROUP BY sod_part
					) so ON so.sod_part = a.pt_part
					where pt_domain = 'EYE'
				) a  
				where is_coi <> 'COI'
			";
		}else if($site == 'JX01'){
			$qry = "
				select pt_part
				, in_avg_iss
				, pt_abc
				, sct_cst_tot 
				, inventory_turns			
				, average_usage_value
				, cp_cust
				, pt_status
				, pt_sfty_stk
				, pt_price
				, pt_part_type
				, onHandQty
				, oh_value
				, openPoQty
				, openpoqtycount
				, last_due_date
				, orderedQty
				, full_desc
				, pt_added
				, pt_avg_int
				, pl_desc
				, pl_inv_acct
				, open_balance
				, total_lines
				, wod_qty_open
				, sct_cst_tot
				, pt_iss_pol
				, pt_buyer
				, pt_pm_code
				, pt_um
				, pl_prod_line
				, is_coi
				, in_iss_date
			from(
				select a.pt_part
					, in_avg_iss
					, in_avg_iss*sct_cst_tot in_avg_iss_value
					, pt_abc
					, cp_cust
					, pt_status
					, pt_sfty_stk
					, pt_price
					, pt_part_type
					, sct_cst_tot
					, CAST(case when onHandQty*sct_cst_tot > 0 THEN ((in_avg_iss*sct_cst_tot)/(onHandQty*sct_cst_tot))*365 ELSE 0 END AS DECIMAL(16,1))  inventory_turns
					, (in_avg_iss*sct_cst_tot) average_usage_value
					, onHandQty
					, openPoQty
					, openpoqtycount
					, last_due_date
					, orderedQty
					, pt_desc1 || ' ' || pt_desc2 full_desc
					, pt_added
					, pt_avg_int
					, pl_desc
					, pl_inv_acct
					, open_balance
					, total_lines
					, wod_qty_open
					, case when pt_iss_pol = 1 THEN 'Yes' ELSE 'No' END pt_iss_pol
					, pt_buyer
					, pt_pm_code
					, pt_um
					, onHandQty*sct_cst_tot oh_value
					, pl_prod_line
					, b.in_iss_date
					, case when (
						RIGHT(a.pt_part, 1) != 'U' AND RIGHT(a.pt_part, 1) != 'R' AND RIGHT(a.pt_part, 1) != 'N' 
					) THEN '-' ELSE 'COI' END is_coi
				from pt_mstr a

				join (
					select in_part, 
						max(in_avg_iss) in_avg_iss,
						max(in_iss_date) in_iss_date
					from in_mstr 
					where in_domain = 'EYE' 
					and in_site = 'JX'
					group by in_part
				) b ON b.in_part = a.pt_part 
				
				LEFT JOIN ( 
					select sct_part 
						, max(sct_cst_tot) sct_cst_tot 
					from sct_det 
					WHERE sct_sim = 'Standard' 
						and sct_domain = 'EYE' 
						and sct_site  = 'EYE01'
					group by sct_part 
				) d ON a.pt_part = d.sct_part  

				LEFT JOIN (
					select max(cp_cust) cp_cust
						, cp_part 
					from cp_mstr 
					where cp_domain = 'EYE'
					group by cp_part
				) cust ON cust.cp_part = a.pt_part
				
				JOIN (
					select a.ld_part
						, sum(ld_qty_oh) onHandQty
					from ld_det a 
					where a.ld_domain = 'EYE' 
					and a.ld_site = 'JX'
					and a.ld_qty_oh > 0
					GROUP BY a.ld_part
					
				) c ON c.ld_part = a.pt_part

				LEFT JOIN (
					select pod_part
						, sum((pod_qty_ord)*pod_std_cost) orderedQty
						, sum(case WHEN a.pod_status != 'c' THEN ((pod_qty_ord-pod_qty_rcvd)*pod_std_cost) ELSE 0 END) openPoQty
						, sum(case WHEN a.pod_status != 'c' THEN pod_qty_ord-pod_qty_rcvd ELSE 0 END) openpoqtycount
						, max(case WHEN a.pod_status = 'c' THEN pod_due_date END ) last_due_date
					from pod_det a
					where a.pod_domain = 'EYE'
					GROUP BY pod_part
				) e ON e.pod_part = a.pt_part

				left join (
					select max(pl_prod_line) pl_prod_line
						, max(pl_inv_acct) pl_inv_acct
						, pl_desc pl_desc
					FROM pl_mstr a 
					WHERE pl_domain = 'EYE' 
						AND pl_prod_line != ''
						group by pl_desc
				) pl ON pl.pl_prod_line = a.pt_prod_line

				LEFT JOIN (
					select count(case when wod_qty_req-wod_qty_iss = 0 then 1 ELSE 0 END) wod_qty_open
						, wod_part
					from wod_det a
					JOIN wo_mstr b ON a.wod_nbr = b.wo_nbr and wo_domain = 'EYE' and wo_due_date > '2019-07-01' and wo_status != 'c' AND wo_site = 'JX'
					WHERE wod_domain = 'EYE'
						AND wod_qty_req != wod_qty_iss
						and wod_status != 'c'
					GROUP BY wod_part
				) g ON g.wod_part = a.pt_part

				LEFT JOIN (
					SELECT sod_part, sum((sod_qty_ord-sod_qty_ship)*sod_price) open_balance, count(sod_part) total_lines
					from sod_det 
					where sod_domain = 'EYE'
					and sod_qty_ord-sod_qty_ship > 0
					GROUP BY sod_part
				) so ON so.sod_part = a.pt_part
				where pt_domain = 'EYE'  
			) a  
			where is_coi <> 'COI'
			";
		} else if ($site == 'RMLV'){
			$qry = "
				select pt_part
				, in_avg_iss
				, pt_abc
				, sct_cst_tot 
				, inventory_turns			
				, average_usage_value
				, cp_cust
				, pt_status
				, pt_sfty_stk
				, pt_price
				, pt_part_type
				, onHandQty
				, oh_value
				, openPoQty
				, openpoqtycount
				, last_due_date
				, orderedQty
				, full_desc
				, pt_added
				, pt_avg_int
				, pl_desc
				, pl_inv_acct
				, open_balance
				, total_lines
				, wod_qty_open
				, sct_cst_tot
				, pt_iss_pol
				, pt_buyer
				, pt_pm_code
				, pt_um
				, pl_prod_line
				, is_coi
				, in_iss_date
			from(
				select a.pt_part
					, in_avg_iss
					, in_avg_iss*sct_cst_tot in_avg_iss_value
					, pt_abc
					, cp_cust
					, pt_status
					, pt_sfty_stk
					, pt_price
					, pt_part_type
					, sct_cst_tot
					, CAST(case when onHandQty*sct_cst_tot > 0 THEN ((in_avg_iss*sct_cst_tot)/(onHandQty*sct_cst_tot))*365 ELSE 0 END AS DECIMAL(16,1))  inventory_turns
					, (in_avg_iss*sct_cst_tot) average_usage_value
					, onHandQty
					, openPoQty
					, openpoqtycount
					, last_due_date
					, orderedQty
					, pt_desc1 || ' ' || pt_desc2 full_desc
					, pt_added
					, pt_avg_int
					, pl_desc
					, pl_inv_acct
					, open_balance
					, total_lines
					, wod_qty_open
					, case when pt_iss_pol = 1 THEN 'Yes' ELSE 'No' END pt_iss_pol
					, pt_buyer
					, pt_pm_code
					, pt_um
					, onHandQty*sct_cst_tot oh_value
					, pl_prod_line
					, b.in_iss_date
					, case when (
						RIGHT(a.pt_part, 1) != 'U' AND RIGHT(a.pt_part, 1) != 'R' AND RIGHT(a.pt_part, 1) != 'N' 
					) THEN '-' ELSE 'COI' END is_coi
				from pt_mstr a

				left join (
					select in_part, 
						max(in_avg_iss) in_avg_iss,
						max(in_iss_date) in_iss_date
					from in_mstr 
					where in_domain = 'EYE' 
						and in_site = 'EYE01'
					group by in_part
				) b ON b.in_part = a.pt_part 
				
				LEFT JOIN ( 
					select sct_part 
						, max(sct_cst_tot) sct_cst_tot 
					from sct_det 
					WHERE sct_sim = 'Standard' 
						and sct_domain = 'EYE'
						and sct_site  = 'EYE01'
					group by sct_part 
				) d ON CAST(a.pt_part AS CHAR(25)) = d.sct_part  

				LEFT JOIN (
					select max(cp_cust) cp_cust
						, cp_part 
					from cp_mstr 
					where cp_domain = 'EYE'
					group by cp_part
				) cust ON cust.cp_part = a.pt_part

				
				JOIN (
					select a.ld_part
						, sum(ld_qty_oh) onHandQty
					from ld_det a 
					
					JOIN ( 
						select loc_loc
						from loc_mstr 
						WHERE loc_domain = 'EYE' 
						and loc_type NOT IN ('FG', 'SS')
						group by loc_loc 
					) cc ON cc.loc_loc = a.ld_loc 
					where a.ld_domain = 'EYE' 
					AND ld_site = 'EYE01'
					AND a.ld_qty_oh > 0
					GROUP BY a.ld_part
					
				) c ON c.ld_part = a.pt_part

				LEFT JOIN (
					select pod_part
						, sum((pod_qty_ord)*pod_std_cost) orderedQty
						, sum(case WHEN a.pod_status != 'c' THEN ((pod_qty_ord-pod_qty_rcvd)*pod_std_cost) ELSE 0 END) openPoQty
						, sum(case WHEN a.pod_status != 'c' THEN pod_qty_ord-pod_qty_rcvd ELSE 0 END) openpoqtycount
						, max(case WHEN a.pod_status = 'c' THEN pod_due_date END ) last_due_date
					from pod_det a
					where a.pod_domain = 'EYE' 
					and pod_site = 'EYE01'
					GROUP BY pod_part
				) e ON e.pod_part = a.pt_part

				left join (
					select max(pl_prod_line) pl_prod_line
						, max(pl_inv_acct) pl_inv_acct
						, pl_desc pl_desc
					FROM pl_mstr a 
					WHERE pl_domain = 'EYE' 
						AND pl_prod_line != ''
						group by pl_desc
				) pl ON pl.pl_prod_line = a.pt_prod_line

				LEFT JOIN (
					select count(case when wod_qty_req-wod_qty_iss = 0 then 1 ELSE 0 END) wod_qty_open
						, wod_part
					from wod_det a
					JOIN wo_mstr b ON a.wod_nbr = b.wo_nbr and wo_domain = 'EYE' and wo_due_date > '2019-07-01' and wo_status != 'c' AND wo_site = 'EYE01'
					WHERE wod_domain = 'EYE'
						AND wod_qty_req != wod_qty_iss
						and wod_status != 'c'
						AND wod_site = 'EYE01'
					GROUP BY wod_part
				) g ON g.wod_part = a.pt_part

				LEFT JOIN (
					SELECT sod_part, sum((sod_qty_ord-sod_qty_ship)*sod_price) open_balance, count(sod_part) total_lines
					from sod_det 
					where sod_domain = 'EYE'
					and sod_qty_ord-sod_qty_ship > 0
					GROUP BY sod_part
				) so ON so.sod_part = a.pt_part
				where pt_domain = 'EYE' 
			) a  
			where is_coi <> 'COI'
			";
		} else if ($site == 'FGLV'){
			$qry = "
				select pt_part
				, in_avg_iss
				, pt_abc
				, sct_cst_tot 
				, inventory_turns			
				, average_usage_value
				, cp_cust
				, pt_status
				, pt_sfty_stk
				, pt_price
				, pt_part_type
				, onHandQty
				, oh_value
				, openPoQty
				, openpoqtycount
				, last_due_date
				, orderedQty
				, full_desc
				, pt_added
				, pt_avg_int
				, pl_desc
				, pl_inv_acct
				, open_balance
				, total_lines
				, wod_qty_open
				, sct_cst_tot
				, pt_iss_pol
				, pt_buyer
				, pt_pm_code
				, pt_um
				, pl_prod_line
				, is_coi
				, in_iss_date
			from(
				select a.pt_part
					, in_avg_iss
					, in_avg_iss*sct_cst_tot in_avg_iss_value
					, pt_abc
					, cp_cust
					, pt_status
					, pt_sfty_stk
					, pt_price
					, pt_part_type
					, sct_cst_tot
					, CAST(case when onHandQty*sct_cst_tot > 0 THEN ((in_avg_iss*sct_cst_tot)/(onHandQty*sct_cst_tot))*365 ELSE 0 END AS DECIMAL(16,1))  inventory_turns
					, (in_avg_iss*sct_cst_tot) average_usage_value
					, onHandQty
					, openPoQty
					, openpoqtycount
					, last_due_date
					, orderedQty
					, pt_desc1 || ' ' || pt_desc2 full_desc
					, pt_added
					, pt_avg_int
					, pl_desc
					, pl_inv_acct
					, open_balance
					, total_lines
					, wod_qty_open
					, case when pt_iss_pol = 1 THEN 'Yes' ELSE 'No' END pt_iss_pol
					, pt_buyer
					, pt_pm_code
					, pt_um
					, onHandQty*sct_cst_tot oh_value
					, pl_prod_line
					, b.in_iss_date
					, case when (
						RIGHT(a.pt_part, 1) != 'U' AND RIGHT(a.pt_part, 1) != 'R' AND RIGHT(a.pt_part, 1) != 'N' 
					) THEN '-' ELSE 'COI' END is_coi
				from pt_mstr a

				left join (
					select in_part, 
						max(in_avg_iss) in_avg_iss,
						max(in_iss_date) in_iss_date
					from in_mstr 
					where in_domain = 'EYE' 
						and in_site = 'EYE01'
					group by in_part
				) b ON b.in_part = a.pt_part 
				
				LEFT JOIN ( 
					select sct_part 
						, max(sct_cst_tot) sct_cst_tot 
					from sct_det 
					WHERE sct_sim = 'Standard' 
						and sct_domain = 'EYE'
						and sct_site  = 'EYE01'
					group by sct_part 
				) d ON CAST(a.pt_part AS CHAR(25)) = d.sct_part  

				LEFT JOIN (
					select max(cp_cust) cp_cust
						, cp_part 
					from cp_mstr 
					where cp_domain = 'EYE'
					group by cp_part
				) cust ON cust.cp_part = a.pt_part
				
				JOIN (
					select a.ld_part
						, sum(ld_qty_oh) onHandQty
					from ld_det a 
					JOIN ( 
						select loc_loc
						from loc_mstr 
						WHERE loc_domain = 'EYE'  
						and loc_type = 'FG'
						group by loc_loc 
					) cc ON cc.loc_loc = a.ld_loc 
					where a.ld_domain = 'EYE' 
					and a.ld_qty_oh > 0
					GROUP BY a.ld_part
				) c ON c.ld_part = a.pt_part

				LEFT JOIN (
					select pod_part
						, sum((pod_qty_ord)*pod_std_cost) orderedQty
						, sum(case WHEN a.pod_status != 'c' THEN ((pod_qty_ord-pod_qty_rcvd)*pod_std_cost) ELSE 0 END) openPoQty
						, sum(case WHEN a.pod_status != 'c' THEN pod_qty_ord-pod_qty_rcvd ELSE 0 END) openpoqtycount
						, max(case WHEN a.pod_status = 'c' THEN pod_due_date END ) last_due_date
					from pod_det a
					where a.pod_domain = 'EYE' 
					and pod_site = 'EYE01'
					GROUP BY pod_part
				) e ON e.pod_part = a.pt_part

				left join (
					select max(pl_prod_line) pl_prod_line
						, max(pl_inv_acct) pl_inv_acct
						, pl_desc pl_desc
					FROM pl_mstr a 
					WHERE pl_domain = 'EYE' 
						AND pl_prod_line != ''
						group by pl_desc
				) pl ON pl.pl_prod_line = a.pt_prod_line

				LEFT JOIN (
					select count(case when wod_qty_req-wod_qty_iss = 0 then 1 ELSE 0 END) wod_qty_open
						, wod_part
					from wod_det a
					JOIN wo_mstr b ON a.wod_nbr = b.wo_nbr and wo_domain = 'EYE' and wo_due_date > '2019-07-01' and wo_status != 'c' AND wo_site = 'EYE01'
					WHERE wod_domain = 'EYE'
						AND wod_qty_req != wod_qty_iss
						and wod_status != 'c'
					GROUP BY wod_part
				) g ON g.wod_part = a.pt_part

				LEFT JOIN (
					SELECT sod_part, sum((sod_qty_ord-sod_qty_ship)*sod_price) open_balance, count(sod_part) total_lines
					from sod_det 
					where sod_domain = 'EYE'
					and sod_qty_ord-sod_qty_ship > 0
					GROUP BY sod_part
				) so ON so.sod_part = a.pt_part
				where pt_domain = 'EYE'
			) a  
			where is_coi <> 'COI'
			";
		}

		$query = $this->db->prepare($qry);
		$query->execute();
		$results = $query->fetchAll(PDO::FETCH_ASSOC);

		return array(
			"results" => $results,
			"resultsq" => [],
			"lastUpdate" => "Live"
		);
	}

	public function Read()
	{

		$from = date("Y-m-01", strtotime("-12 months"));
		$from12 = date("n", strtotime("-12 months"));
		$from11 = date("n", strtotime("-11 months"));
		$from10 = date("n", strtotime("-10 months"));
		$from9 = date("n", strtotime("-9 months"));
		$from8 = date("n", strtotime("-8 months"));
		$from7 = date("n", strtotime("-7 months"));
		$from6 = date("n", strtotime("-6 months"));
		$from5 = date("n", strtotime("-5 months"));
		$from4 = date("n", strtotime("-4 months"));
		$from3 = date("n", strtotime("-3 months"));
		$from2 = date("n", strtotime("-2 months"));
		$from1 = date("n", strtotime("-1 months"));
		$to = date('Y-m-d', strtotime('last day of previous month'));



		$from12Start = date('Y-m-01', strtotime("-12 months"));
		$from12End = date('Y-m-t', strtotime("-12 months"));

		$from11Start = date('Y-m-01', strtotime("-11 months"));
		$from11End = date('Y-m-t', strtotime("-11 months"));

		$from10Start = date('Y-m-01', strtotime("-10 months"));
		$from10End = date('Y-m-t', strtotime("-10 months"));

		$from9Start = date('Y-m-01', strtotime("-9 months"));
		$from9End = date('Y-m-t', strtotime("-9 months"));

		$from8Start = date('Y-m-01', strtotime("-8 months"));
		$from8End = date('Y-m-t', strtotime("-8 months"));

		$from7Start = date('Y-m-01', strtotime("-7 months"));
		$from7End = date('Y-m-t', strtotime("-7 months"));

		$from6Start = date('Y-m-01', strtotime("-6 months"));
		$from6End = date('Y-m-t', strtotime("-6 months"));

		$from5Start = date('Y-m-01', strtotime("-5 months"));
		$from5End = date('Y-m-t', strtotime("-5 months"));

		$from4Start = date('Y-m-01', strtotime("-4 months"));
		$from4End = date('Y-m-t', strtotime("-4 months"));

		$from3Start = date('Y-m-01', strtotime("-3 months"));
		$from3End = date('Y-m-t', strtotime("-3 months"));

		$from2Start = date('Y-m-01', strtotime("-2 months"));
		$from2End = date('Y-m-t', strtotime("-2 months"));

		$from1Start = date('Y-m-01', strtotime("-1 months"));
		$from1End = date('Y-m-t', strtotime("-1 months"));

		$qry = "
				select  pt_desc1
					, tr_part
					, lastMonth1
					, lastMonth2
					, lastMonth3
					, lastMonth4
					, lastMonth5
					, lastMonth6
					, lastMonth7
					, lastMonth8
					, lastMonth9
					, lastMonth10
					, lastMonth11
					, lastMonth12
					, total
					, average
					, CAST(ABS(sumOfTrans / 12) AS DECIMAL(16,2))  sumOfTrans
					, po_vend
					, pt_pm_code
					from ( select tr_part tr_part
					, max(b.pt_desc1) pt_desc1
					, sum(case when tr_date between '" . $from1Start  . "' AND '" . $from1End . "' then tr_qty_chg else 0 end) lastMonth1
					, sum(case when tr_date between '" . $from2Start  . "' AND '" . $from2End . "' then tr_qty_chg else 0 end) lastMonth2
					, sum(case when tr_date between '" . $from3Start  . "' AND '" . $from3End . "' then tr_qty_chg else 0 end) lastMonth3
					, sum(case when tr_date between '" . $from4Start  . "' AND '" . $from4End . "' then tr_qty_chg else 0 end) lastMonth4
					, sum(case when tr_date between '" . $from5Start  . "' AND '" . $from5End . "' then tr_qty_chg else 0 end) lastMonth5
					, sum(case when tr_date between '" . $from6Start  . "' AND '" . $from6End . "' then tr_qty_chg else 0 end) lastMonth6
					, sum(case when tr_date between '" . $from7Start  . "' AND '" . $from7End . "' then tr_qty_chg else 0 end) lastMonth7
					, sum(case when tr_date between '" . $from8Start  . "' AND '" . $from8End . "' then tr_qty_chg else 0 end) lastMonth8
					, sum(case when tr_date between '" . $from9Start  . "' AND '" . $from9End . "' then tr_qty_chg else 0 end) lastMonth9
					, sum(case when tr_date between '" . $from10Start  . "' AND '" . $from10End . "' then tr_qty_chg else 0 end) lastMonth10
					, sum(case when tr_date between '" . $from11Start  . "' AND '" . $from11End . "' then tr_qty_chg else 0 end) lastMonth11
					, sum(case when tr_date between '" . $from12Start  . "' AND '" . $from12End . "' then tr_qty_chg else 0 end) lastMonth12
					, avg(tr_qty_chg*sct_cst_tot) average
					, sum(tr_qty_chg) sumOfTrans
					, max(IFNULL(d.orderedQty,0))orderedQty
					, max(IFNULL(d.openQty,0))openQty
					, IFNULL(f.po_vend,'') po_vend
					, max(IFNULL(c.totalAvailable,0)) totalAvailable
					, max(b.pt_sfty_stk) pt_sfty_stk
					, max(wod_qty_req) wod_qty_req
					, max(wod_qty_iss) wod_qty_iss
					, max(b.pt_pm_code) pt_pm_code
					, max(sct_cst_tot) sct_cst_tot
					, ABS(sum(tr_qty_chg) * max(sct_cst_tot)) total
					
				from tr_hist a
				
				JOIN pt_mstr b 
					ON b.pt_part = a.tr_part
					AND pt_domain = 'EYE'
					AND  pt_prod_line != 15

				LEFT JOIN ( 
					select sct_part
						, max(sct_cst_tot) sct_cst_tot
					from sct_det
					WHERE sct_sim = 'Standard' 
						and sct_domain = 'EYE' 
						and sct_site  = 'EYE01'
					group by sct_part
				) dd ON tr_part = dd.sct_part 
					
				LEFT JOIN (
					select a.ld_part
						, sum(ld_qty_oh) - max(ABS(totalAll)) totalAvailable
                    from ld_det a 
					LEFT JOIN (
						select b.in_part  
							, sum(b.in_qty_avail) totalAvail 
							, sum(b.in_qty_all) totalAll 
							, sum(b.in_qty_oh) totalOnHand
						from in_mstr b  
						GROUP BY b.in_part
					) b ON b.in_part =  a.ld_part
                    where a.ld_domain = 'EYE' 
						AND ld_loc NOT IN ('ZZ100', 'INTGRTD', 'JIAXING')
					GROUP BY a.ld_part
					
				) c ON c.ld_part = a.tr_part
				
				
				LEFT JOIN (
					select pod_part
						, sum(pod_qty_ord) orderedQty
						, sum(pod_qty_ord-pod_qty_rcvd) openQty
					from pod_det a
					where a.pod_domain = 'EYE'
						AND a.pod_status != 'c'
						AND year(pod_due_date) >= '2019'
					GROUP BY pod_part
				) d ON d.pod_part = a.tr_part
				
				LEFT JOIN (
					select pod_part
						, max(po_ord_date) po_ord_date
					from pod_det a
					left join (
						select po_nbr
							, po_ord_date
						FROM po_mstr
						WHERE po_domain = 'EYE'
					) b ON b.po_nbr = a.pod_nbr
					WHERE pod_domain = 'EYE'
					GROUP BY pod_part
				) e ON e.pod_part = a.tr_part
				
				
				LEFT JOIN (
					select pod_part
						, max(po_ord_date) po_ord_date
						, po_vend po_vend
					from pod_det a
					left join (
						select po_nbr
							, po_ord_date
							, po_vend
						FROM po_mstr
						WHERE po_domain = 'EYE'
					) b ON b.po_nbr = a.pod_nbr
					WHERE pod_domain = 'EYE'
					GROUP BY pod_part, po_vend
				) f ON f.pod_part = e.pod_part
					AND f.po_ord_date = e.po_ord_date
					
					
				LEFT JOIN (
					select sum(wod_qty_req) wod_qty_req
						, sum(wod_qty_iss) wod_qty_iss
						, wod_part
					from wod_det a
					JOIN wo_mstr b ON a.wod_nbr = b.wo_nbr and wo_domain = 'EYE' and wo_due_date > '2019-07-01'
					WHERE wod_domain = 'EYE'
						AND wod_qty_req != wod_qty_iss
					GROUP BY wod_part
				) g ON g.wod_part = a.tr_part
				
				
				where a.tr_type IN ('ISS-SO', 'ISS-WO')
					and tr_date between :from AND :to
					and tr_domain = 'EYE'
					and tr_loc NOT IN ('INTGRTD', 'JIAXING', 'intgrtd', 'jiaxing')
				GROUP BY tr_part, f.po_vend
				) a
				WITH (NOLOCK)
			";

		$query = $this->db->prepare($qry);
		$query->bindParam(":from", $from, PDO::PARAM_STR);
		$query->bindParam(":to", $to, PDO::PARAM_STR);
		$query->execute();
		$results = $query->fetchAll(PDO::FETCH_ASSOC);

		$obj = array(
			"m12" => $from12Start,
			"m12end" => $from12End,
			"m11" => $from11Start,
			"m10" => $from10Start,
			"m9" => $from9Start,
			"m8" => $from8Start,
			"m7" => $from7Start,
			"m6" => $from6Start,
			"m5" => $from5Start,
			"m4" => $from4Start,
			"m3" => $from3Start,
			"m2" => $from2Start,
			"m1" => $from1Start,
			"fromTo" => $from . "  " . $to,
			"results" => $results
		);
		return $obj;
	}

	public function __destruct()
	{
		$this->db = null;
	}
}
