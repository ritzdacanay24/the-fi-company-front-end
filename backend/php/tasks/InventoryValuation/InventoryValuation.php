<?php


class ItemUsage
{

	protected $db;

	public function __construct($dbQad)
	{

		$this->db = $dbQad;
		$this->nowDate = date("Y-m-d");
	}

	public function shippingReport()
    {

        $mainQry = "
        select overdue_open + due_open open_total_lines 	
			, overdue_open_val + due_open_val total_lines_overdue_value
			, overdue_shipped_val + due_shipped_val + future_shipped_val total_shipped_today_value
			, overdue_shipped + due_shipped + future_shipped total_shipped_today_lines
			, case when due_total > 0 THEN (on_time_delivery_today / due_total)*100 ELSE 0 END on_time_delivery_today
    from ( 
        select 
        
            SUM(case when a.sod_due_date < '" . $this->nowDate . "' AND sod_qty_ord != sod_qty_ship AND c.so_compl_date IS NULL THEN 1 ELSE 0 END) overdue_open,
            SUM(case when a.sod_due_date = '" . $this->nowDate . "' AND sod_qty_ord != sod_qty_ship AND c.so_compl_date IS NULL THEN 1 ELSE 0 END) due_open,

            sum(case when a.sod_due_date < '" . $this->nowDate . "' AND c.so_compl_date IS NULL THEN sod_list_pr*(sod_qty_ord - sod_qty_ship) ELSE 0 END ) overdue_open_val,
            sum(case when a.sod_due_date = '" . $this->nowDate . "' AND c.so_compl_date IS NULL THEN sod_list_pr*(sod_qty_ord - sod_qty_ship) ELSE 0 END ) due_open_val,

            sum(case when a.sod_due_date < f.abs_shp_date THEN 1 ELSE 0 END ) overdue_shipped, 
            sum(case when f.abs_shp_date = a.sod_due_date AND sod_qty_ord = sod_qty_ship THEN 1 ELSE 0 END ) due_shipped,  
			sum(case when a.sod_due_date > f.abs_shp_date THEN 1 ELSE 0 END ) future_shipped, 


            sum(case when a.sod_due_date < '" . $this->nowDate . "' THEN sod_list_pr*f.abs_ship_qty ELSE 0 END ) overdue_shipped_val,
            sum(case when g.abs_shp_date = '" . $this->nowDate . "' AND a.sod_due_date = '" . $this->nowDate . "' THEN sod_list_pr*g.abs_ship_qty ELSE 0 END ) due_shipped_val, 
            sum(case when a.sod_due_date > '" . $this->nowDate . "' THEN sod_list_pr*f.abs_ship_qty ELSE 0 END ) future_shipped_val, 

            SUM(case when a.sod_due_date = '" . $this->nowDate . "' THEN 1 ELSE 0 END) due_total,
            sum(case when  sod_qty_ord - sod_qty_ship = 0 AND g.abs_ship_qty = sod_qty_ship AND a.sod_due_date = '" . $this->nowDate . "' AND g.abs_shp_date <= '" . $this->nowDate . "'  THEN 1 ELSE 0 END ) on_time_delivery_today

        from sod_det a

        left join (
            select so_nbr, so_compl_date
            from so_mstr
            where so_domain = 'EYE'
        ) c ON c.so_nbr = a.sod_nbr

            
            LEFT join (
                select abs_line
                    , sum(abs_ship_qty) abs_ship_qty
                    , abs_order
                    , max(abs_shp_date) abs_shp_date
                from abs_mstr 
                where abs_domain = 'EYE'
                and abs_shp_date = '" . $this->nowDate . "'
                and abs_ship_qty > 0
                GROUP BY  abs_line
                    , abs_order
            ) f ON f.abs_order = a.sod_nbr
                AND f.abs_line = a.sod_line

            LEFT join (
                select abs_line
                    , sum(abs_ship_qty) abs_ship_qty
                    , abs_order
                    , max(abs_shp_date) abs_shp_date
                from abs_mstr 
                where abs_domain = 'EYE'
                and abs_ship_qty > 0
                GROUP BY  abs_line
                    , abs_order
            ) g ON g.abs_order = a.sod_nbr
                AND g.abs_line = a.sod_line
            

        WHERE sod_domain = 'EYE'
            
    ) a 
    WITH (NOLOCK)
            ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

	public function test()
	{
#CTO-00302-000      
#WDG-03346-400P     


		$qry = "
			select  a.tr_part
				, max(tr_prod_line) tr_prod_line  
				, sum(a.tr_qty_chg) tr_qty_chg
				, sum(sct_cst_tot* a.tr_qty_chg) gl_ext_amount 
				, sum(tr_qty_short) tr_qty_short 
				, sum(tr_qty_chg) tr_qty_chg 
				, sum(tr_loc_begin) tr_loc_begin 
				, sum(tr_qty_req) tr_qty_req
				, sum(tr_qty_loc) tr_qty_loc
				, sum(case when tr_prod_line = 2 THEN (tr_qty_req - tr_loc_begin) - tr_qty_short END) test 
			from tr_hist a 
			LEFT JOIN ( 
				select sct_part 
					, max(sct_cst_tot) sct_cst_tot 
				from sct_det 
				WHERE sct_sim = 'Standard' 
					and sct_domain = 'EYE'  
					and sct_site  = 'EYE01'
				group by sct_part 
			) d ON d.sct_part = a.tr_part
			where a.tr_effdate <= '2022-01-31'
			and tr_domain = 'EYE'
			and tr_loc != ''
			group by a.tr_part
			WITH (nolock)  
		";
		$query = $this->db->prepare($qry);
		$query->execute();
		return $results =  $query->fetchAll(PDO::FETCH_ASSOC);
	}

	public function getInventoryValuation()
	{

		$qry = "
			select pt_part, in_avg_iss, pt_abc, sct_cst_tot, m_12, case WHEN m_12 < 1 then (TO_CHAR(m_12)) else  m_12 end  m_12
            from(select pt_part, in_avg_iss, pt_abc, sct_cst_tot, (CAST(((in_avg_iss*sct_cst_tot)/(12/12)) AS DECIMAL(16,1)))  m_12

             
			from pt_mstr a

			left join (
				select in_part, 
					in_avg_iss
				from in_mstr 
				where in_domain = 'EYE' 
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
			where pt_domain = 'EYE') a
			WITH (nolock)  
		";
		$query = $this->db->prepare($qry);
		$query->execute();
		$results =  $query->fetchAll(PDO::FETCH_ASSOC);

		$qry = "
			select pt_abc,
				sum(in_qty_oh*sct_cst_tot) total
			from in_mstr a
			LEFT JOIN ( 
				select sct_part 
					, max(sct_cst_tot) sct_cst_tot 
				from sct_det 
				WHERE sct_sim = 'Standard' 
					and sct_domain = 'EYE'  
					and sct_site  = 'EYE01'
				group by sct_part 
			) d ON CAST(a.in_part AS CHAR(25)) = d.sct_part  
			left join pt_mstr c ON c.pt_part = a.in_part
			where in_domain = 'EYE'
			group by c.pt_abc
			WITH (nolock)  
		";
		$query = $this->db->prepare($qry);
		$query->execute();
		$resultsq =  $query->fetchAll(PDO::FETCH_ASSOC);


		return $results;
	}

	public function getInventoryValuationtest()
	{

		$from = date("Y-m-d", strtotime("-12 months"));
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

		$from3Date = date("Y-m-01", strtotime("-3 months"));
		$from6Date = date("Y-m-01", strtotime("-6 months"));

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
					, ABS(case when avg_12 = 0 THEN 0 ELSE (total/avg_12) * 12/12  END)  turn12Month 
					, ABS(case when lastMonth6Turn = 0 THEN 0 ELSE (total/lastMonth6Turn) * 12/6  END)  turn6Month
					, ABS(case when lastMonth3Turn = 0 THEN 0 ELSE (total/lastMonth3Turn) * 12/3  END)  turn3Month
					, total
					, lastMonth12Turn/12 avg_12
					, lastMonth6Turn/6 avg_6
					, lastMonth3Turn/3 avg_3
					, lastMonth12Turn tot_12
					, lastMonth6Turn tot_6
					, lastMonth3Turn tot_3
					, usage12mQty
					, usage6mQty
					, usage3mQty
					, orderedQty
					, openQty
					, openpoqtycount
					, last_due_date
					, pt_article
					, pt_status
					, pt_sfty_stk
					, pt_price
					, pt_part_type
					, totalAvailable
					, (open_balance) open_balance
					, (total_lines) total_lines
					from ( 
						select tr_part tr_part
							, max(b.pt_desc1) pt_desc1
							, max(cp_cust)  pt_article
							, max(b.pt_status) pt_status
							, max(pt_sfty_stk) pt_sfty_stk
							, max(pt_price) pt_price
							, max(pt_part_type) pt_part_type
							, sum(case when month(tr_date) = " . $from1  . " then tr_qty_chg*sct_cst_tot else 0 end) lastMonth1
							, sum(case when month(tr_date) = " . $from2  . " then tr_qty_chg*sct_cst_tot else 0 end) lastMonth2
							, sum(case when month(tr_date) = " . $from3  . " then tr_qty_chg*sct_cst_tot else 0 end) lastMonth3
							, sum(case when month(tr_date) = " . $from4  . " then tr_qty_chg*sct_cst_tot else 0 end) lastMonth4
							, sum(case when month(tr_date) = " . $from5  . " then tr_qty_chg*sct_cst_tot else 0 end) lastMonth5
							, sum(case when month(tr_date) = " . $from6  . " then tr_qty_chg*sct_cst_tot else 0 end) lastMonth6
							, sum(case when month(tr_date) = " . $from7  . " then tr_qty_chg*sct_cst_tot else 0 end) lastMonth7
							, sum(case when month(tr_date) = " . $from8  . " then tr_qty_chg*sct_cst_tot else 0 end) lastMonth8
							, sum(case when month(tr_date) = " . $from9  . " then tr_qty_chg*sct_cst_tot else 0 end) lastMonth9
							, sum(case when month(tr_date) = " . $from10  . " then tr_qty_chg*sct_cst_tot else 0 end) lastMonth10
							, sum(case when month(tr_date) = " . $from11  . " then tr_qty_chg*sct_cst_tot else 0 end) lastMonth11
							, sum(case when month(tr_date) = " . $from12  . " then tr_qty_chg*sct_cst_tot else 0 end) lastMonth12
							, sum(tr_qty_chg*sct_cst_tot) lastMonth12Turn
							, sum(case when tr_date between '" . $from6Date  . "' AND '" . $to  . "'  then tr_qty_chg*sct_cst_tot else 0 end) lastMonth6Turn
							, sum(case when tr_date between '" . $from3Date  . "' AND '" . $to  . "'  then tr_qty_chg*sct_cst_tot else 0 end) lastMonth3Turn

							, sum(tr_qty_chg) usage12mQty
							, sum(case when tr_date between '" . $from6Date  . "' AND '" . $to  . "'  then tr_qty_chg*sct_cst_tot else 0 end) usage6mQty
							, sum(case when tr_date between '" . $from3Date  . "' AND '" . $to  . "'  then tr_qty_chg*sct_cst_tot else 0 end) usage3mQty


							, sum(tr_qty_chg*sct_cst_tot) avg_12
							, max(IFNULL(d.orderedQty,0))orderedQty
							, max(IFNULL(d.openQty,0))openQty
							, IFNULL(f.po_vend,'') PO_VENDOR
							, max(IFNULL(c.totalAvailable,0)) totalAvailable
							, max(b.pt_sfty_stk) pt_sfty_stk
							, max(wod_qty_req) wod_qty_req
							, max(wod_qty_iss) wod_qty_iss
							, max(b.pt_pm_code) pt_pm_code
							, max(sct_cst_tot) sct_cst_tot
							, ABS(sum(tr_qty_chg) * max(sct_cst_tot)) total
							, max(openpoqtycount) openpoqtycount
							, max(last_due_date) last_due_date
							, max(open_balance) open_balance
							, max(total_lines) total_lines
						from tr_hist a
				
						JOIN pt_mstr b 
							ON b.pt_part = a.tr_part
							AND pt_domain = 'EYE'

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
							select cp_cust, cp_part from cp_mstr where cp_domain = 'EYE'
						) cust ON cust.cp_part = tr_part
							
						LEFT JOIN (
							select a.ld_part
								, sum(ld_qty_oh) totalAvailable
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
							GROUP BY a.ld_part
							
						) c ON c.ld_part = a.tr_part


						LEFT JOIN (
							SELECT sod_part, sum((sod_qty_ord-sod_qty_ship)*sod_price) open_balance, count(sod_part) total_lines
							from sod_det 
							where sod_domain = 'EYE'
							and sod_qty_ord-sod_qty_ship > 0
							GROUP BY sod_part
						) so ON so.sod_part = a.tr_part
						
						
						LEFT JOIN (
							select pod_part
								, sum((pod_qty_ord)*pod_std_cost) orderedQty
								, sum(case WHEN a.pod_status != 'c' THEN ((pod_qty_ord-pod_qty_rcvd)*pod_std_cost) ELSE 0 END) openQty
								, sum(case WHEN a.pod_status != 'c' THEN pod_qty_ord-pod_qty_rcvd ELSE 0 END) openpoqtycount
								, max(case WHEN a.pod_status = 'c' THEN pod_due_date END ) last_due_date
							from pod_det a
							where a.pod_domain = 'EYE'
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
			"m12" => $from12,
			"m11" => $from11,
			"m10" => $from10,
			"m9" => $from9,
			"m8" => $from8,
			"m7" => $from7,
			"m6" => $from6,
			"m5" => $from5,
			"m4" => $from4,
			"m3" => $from3,
			"m2" => $from2,
			"m1" => $from1,
			"3" => $from3Date  . "' AND '" . $to,
			"6" => $from6Date  . "' AND '" . $to,
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



use EyefiDb\Databases\DatabaseQad as DatabaseQad;

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();
$dbQad->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);


$data = new ItemUsage($dbQad);
$data->nowDate = date("Y-m-d H:i:s", time());

$results = $data->shippingReport();

class Foo
{
	public static function jsonToDebug($jsonText = '')
	{
		$arr = json_decode($jsonText, true);
		$html = "<style type='text/css'>
        body{
            padding:5px !important;
            margin:5px !important;
        }

        .center:first-child {
            margin-left: auto;
            margin-right: auto;
          }

        table tr:first-child>th{
            position: sticky;
            top: 0;
        }
        table {
            margin: 0px;
            border-collapse: collapse;
        }
        table, th, td {
            border: 1px solid black;
            padding:3px;
            white-space:normal;
        }
        th {
            font-family: Arial, Helvetica, sans-serif;
            font-size: .75em;
            background: #666;
            color: #FFF;
            padding: 2px 6px;
            border-collapse: separate;
            border: 1px solid #000;
        }
        td {
            font-family: Arial, Helvetica, sans-serif;
            font-size: .75em;
            border: 1px solid #DDD;
        }
    </style>";
		if ($arr && is_array($arr)) {
			$html .= self::_arrayToHtmlTableRecursive($arr);
		}
		return $html;
	}

	private static function _arrayToHtmlTableRecursive($arr)
	{
		$str = "<div class='center1'><table><tbody style='margin-left:0px'>";
		foreach ($arr as $key => $val) {
			$str .= "<tr>";
			$str .= "<td>$key</td>";
			$str .= "<td>";
			if (is_array($val)) {
				if (!empty($val)) {
					$str .= self::_arrayToHtmlTableRecursive($val);
				}
			} else {
				$str .= "<strong>$val</strong>";
			}
			$str .= "</td></tr>";
		}
		$str .= "</tbody></table></div>";

		return $str;
	}
}


echo $jsonText = $db_connect_qad->jsonToTable($results);

//echo Foo::jsonToDebug($jsonText);
