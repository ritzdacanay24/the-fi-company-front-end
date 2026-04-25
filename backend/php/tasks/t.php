<?php

class unfinishedForkliftInspections
{

    protected $db;

    public function __construct($db, $dbQad)
    {

        $this->db = $dbQad;
        $this->db1 = $db;
        $this->nowDate = date("Y-m-d", time());
        $this->nowDateTime = date("Y-m-d h:m:s", time());
        $this->app_email_error_from = 'noreply@the-fi-company.com';
    }

    public function getWeek($week, $year)
    {
        $dto = new DateTime();
        $result['start'] = $dto->setISODate($year, $week, 0)->format('Y-m-d');
        $result['end'] = $dto->setISODate($year, $week, 6)->format('Y-m-d');
        return $result;
    }

    public function getWeeks()
    {
        $signupdate = '2021-01-04';
        $signupweek = date("W", strtotime($signupdate));
        $year = date("Y", strtotime($signupdate));
        $currentweek = date("W");


        $data = [];
        for ($i = $signupweek; $i <= $currentweek; $i++) {
            $results = $this->getWeek($i, $year);

            $dateStart = date_create($results['start']);
            $dateEnd = date_create($results['end']);

            $results['dateStart'] = date_format($dateStart, "M d");
            $results['dateEnd'] = date_format($dateEnd, "M d");
            $results['week'] = $i;
            $results['data'] = 0;
            $data[] = $results;
        }

        return $data;
    }
    public function externalComplaintsByWeek()
    {
        $mainQry = "
            SELECT week(createdDate) week, year(createdDate) year, count(*) value
            FROM eyefidb.qa_capaRequest 
            where type1 LIKE '%external%'
                AND date(createdDate) between '2021-01-01' AND '2021-12-31'
            group by week(createdDate), year(createdDate)
		";
        $query = $this->db1->prepare($mainQry);
        $query->execute();
        $results = $query->fetchAll(PDO::FETCH_ASSOC);

        $weeks = $this->getWeeks();

        foreach ($weeks as &$row) {
            foreach ($results as $row1) {
                if ($row['week'] == $row1['week']) {
                    $row['data'] += $row1['value'];
                }
            }
        }

        $chartData = array();
        foreach ($weeks as $row) {
            $chartData['label'][] = $row['start'] . " " . $row['end'];
            $chartData['value'][] = $row['data'];
        }

        return $chartData;
    }

    public function internalComplaintsByWeek()
    {
        $mainQry = "
            SELECT week(createdDate) week, year(createdDate) year, count(*) value
            FROM eyefidb.qa_capaRequest 
            where type1 LIKE '%internal%'
                AND date(createdDate) between '2021-01-01' AND '2021-12-31'
            group by week(createdDate), year(createdDate)
		";
        $query = $this->db1->prepare($mainQry);
        $query->execute();
        $results = $query->fetchAll(PDO::FETCH_ASSOC);

        $weeks = $this->getWeeks();

        foreach ($weeks as &$row) {
            foreach ($results as $row1) {
                if ($row['week'] == $row1['week']) {
                    $row['data'] += $row1['value'];
                }
            }
        }

        $chartData = array();
        foreach ($weeks as $row) {
            $chartData['label'][] = $row['start'] . " " . $row['end'];
            $chartData['value'][] = $row['data'];
        }

        return $chartData;
    }

    //YTD
    public function externalFailureTypesByWeek()
    {
        $mainQry = "
            SELECT year(createdDate) year, count(*) value, failuretype
            FROM eyefidb.qa_capaRequest 
            where type1 LIKE '%external%'
                AND date(createdDate) between '2021-01-01' AND '2021-12-31'
            group by year(createdDate), failuretype
		";
        $query = $this->db1->prepare($mainQry);
        $query->execute();
        $results = $query->fetchAll(PDO::FETCH_ASSOC);

        $weeks = $this->getWeeks();

        $chartData = array();
        foreach ($results as $row) {
            $chartData['label'][] = $row['failuretype'];
            $chartData['value'][] = $row['value'];
        }

        return $chartData;
    }

    //YTD
    public function internalFailureTypesByWeek()
    {
        $mainQry = "
                select week(f.abs_shp_date) week
                , year(f.abs_shp_date) year
                , count(case 
                        when a.sod_due_date >= f.abs_shp_date 
                                then 1 
                end) onTimeShipmentCount
                , count(0) total
                , (sum(case 
                        when a.sod_due_date >= f.abs_shp_date 
                            then 1 
                end) / count(0))*100 onTimeShipment
                ,count(c.so_cust) total
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
                and abs_shp_date between '2021-12-19' and '2021-12-25'
            GROUP BY  week(f.abs_shp_date), year(f.abs_shp_date)
            ORDER BY week(f.abs_shp_date), year(f.abs_shp_date)
            WITH (NOLOCK)
		";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getMiscInfoBySalesOrderNumbers($in)
    {
        try {
            $comments = "
                SELECT lateReasonCode, so
                FROM eyefidb.workOrderOwner a
                WHERE a.so IN ($in)
            ";
            $query = $this->db1->prepare($comments);
            $query->execute();
            return $query->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    function groupBy($rows, ...$keys)
    {
        if ($key = array_shift($keys)) {
            $groups = array_reduce($rows, function ($groups, $row) use ($key) {
                $group = is_object($row) ? $row->{$key} : $row[$key]; // object is available too.
                $groups[$group][] = $row;
                return $groups;
            }, []);
            if ($keys) {
                foreach ($groups as $subKey => $subRows) {
                    $groups[$subKey] = $this->groupBy($subRows, ...$keys);
                }
            }
        }
        return $groups;
    }

    public function getShippingInfo()
    {
        try {
            $mainQry = "
                select a.sod_nbr sod_nbr
                    , a.sod_line sod_line
                    , c.so_cust so_cust
                    , a.sod_nbr || '-' || RTRIM(LTRIM(TO_CHAR(a.sod_line))) sales_order_line_number
                from sod_det a
                
                left join (
                    select pt_part			
                        , max(pt_desc1) pt_desc1
                        , max(pt_desc2) pt_desc2				
                        , max(CONCAT(pt_desc1, pt_desc2)) fullDesc
                        , max(pt_routing) pt_routing
                    from pt_mstr
                    where pt_domain = 'EYE'
                    group by pt_part		
                ) b ON b.pt_part = a.sod_part
                
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
                ) c ON c.so_nbr = a.sod_nbr
                
                LEFT JOIN (
                    select a.ld_part
                        , sum(a.ld_qty_oh) ld_qty_oh
                    from ld_det a
                    JOIN loc_mstr b ON b.loc_loc = a.ld_loc 
                        AND b.loc_type = 'FG' 
                        AND loc_domain = 'EYE'
                    WHERE a.ld_domain = 'EYE'
                        AND ld_status != 'UA'
                    GROUP BY a.ld_part
                ) e ON e.ld_part = a.sod_part
                
                LEFT JOIN (
                    select cmt_cmmt
                        , cmt_indx
                    from cmt_det 
                    where cmt_domain = 'EYE' 
                ) f ON f.cmt_indx = a.sod_cmtindx
                    
                WHERE sod_domain = 'EYE'
                    AND sod_qty_ord != sod_qty_ship	
                    AND so_compl_date IS NULL
                    AND SOD_DUE_DATE < CURDATE()
                ORDER BY a.sod_due_date ASC 
                WITH (NOLOCK)
            ";
            $query = $this->db->prepare($mainQry);
            $query->execute();
            $results = $query->fetchAll(PDO::FETCH_ASSOC);

            $in_array = array();
            foreach ($results as $row) {
                $in_array[] = $row['SOD_NBR'] . '-' . $row['SOD_LINE'];
            }

            $in = "'" . implode("','", $in_array) . "'";

            $misc_info = $this->getMiscInfoBySalesOrderNumbers($in);

            foreach ($results as &$row) {
                $row['lateReasonCode'] = "Late Reason Not Available";

                foreach ($misc_info as $misc_info_row) {
                    if ($row['SALES_ORDER_LINE_NUMBER'] == $misc_info_row['so']) {
                        if ($misc_info_row['lateReasonCode'] == "") {
                            $row['lateReasonCode'] = "Late Reason Not Available";
                        } else {
                            $row['lateReasonCode'] = $misc_info_row['lateReasonCode'];
                        }
                    }
                }
            }

            $byGroup = $this->groupBy($results, "SO_CUST", "lateReasonCode");

            $test = [];
            foreach ($byGroup as $key => $value) {

                // $d = $value;
                foreach ($value as $key1 => $value1) {


                    $value[$key1] = array(
                        "customer" => $key,
                        "reasons" => $value[$key1]
                    );
                }
                $test[] = $byGroup[$key];
            }


            return $test;
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function test2()
    {
        $month1 = '2020-11-30';

        $mainQry = "
            select a.tr_part, max(c.tr_mtl_std) tr_mtl_std 
            from tr_hist a 
            LEFT join (
                select max(tr_effdate) tr_effdate
                    , tr_part
                from tr_hist 
                where tr_effdate <= :month1 
                    and tr_domain = 'EYE'
                    and tr_loc != 'LVFG'
                group by tr_part
            ) b ON b.tr_effdate = a.tr_effdate
                and b.tr_part = a.tr_part

            LEFT join (
                select tr_effdate
                    , tr_part
                    , tr_mtl_std
                from tr_hist 
                where tr_effdate <= :month3 
                and tr_domain = 'EYE'
                and tr_loc != 'LVFG'
            ) c ON c.tr_effdate = b.tr_effdate
                and c.tr_part = b.tr_part

            where a.tr_effdate <= :month2 
                and tr_domain = 'EYE'
                and tr_loc != 'LVFG'
                and a.tr_part = 'ASY-03182-100'
            group by a.tr_part
		";

        $query = $this->db->prepare($mainQry);
        $query->bindParam(":month1", $month1, PDO::PARAM_STR);
        $query->bindParam(":month2", $month1, PDO::PARAM_STR);
        $query->bindParam(":month3", $month1, PDO::PARAM_STR);

        $query->execute();
        return  $query->fetchAll(PDO::FETCH_ASSOC);
    }
    public function test()
    {
        
        $mainQry = "
            select pt_part
            , sum(tr_qty_chg_4*tr_mtl_std_4) ext_4
            , max(tr_qty_chg_3) ext_3
			from(
				select  pt_part
                , max(tr_qty_chg_4) tr_qty_chg_4
                , max(tr_mtl_std_4) tr_mtl_std_4

                , max(tr_qty_chg_3) tr_qty_chg_3
                , max(tr_mtl_std_3) tr_mtl_std_3
				from pt_mstr a

                left join (
					select a.tr_part
                        , max(case when tr_effdate <= :month4 THEN tr_effdate when tr_effdate <= :month3 THEN tr_effdate when tr_effdate <= :month2 THEN tr_effdate when tr_effdate <= :month1 THEN tr_effdate END) tr_effdate
                        , sum(case when tr_effdate <= :month4_ THEN case when tr_status != '' THEN case when a.tr_loc = 'INTGRTD' THEN a.tr_qty_chg ELSE a.tr_qty_loc END END END ) tr_qty_chg_4
                        , sum(case when tr_effdate <= :month3_ THEN case when tr_status != '' THEN case when a.tr_loc = 'INTGRTD' THEN a.tr_qty_chg ELSE a.tr_qty_loc END END END ) tr_qty_chg_3
                    from tr_hist a 
					where a.tr_effdate <= :month4__
						and tr_domain = 'EYE'
						and tr_loc != 'LVFG'
					group by a.tr_part
				) tr ON tr.tr_part = a.pt_part 

                LEFT join (
                    select case when tr_effdate <= :month4_0 THEN tr_effdate when tr_effdate <= :month3_0 THEN tr_effdate when tr_effdate <= :month2_0 THEN tr_effdate when tr_effdate <= :month1_0 THEN tr_effdate END tr_effdate
                        , tr_part
                        , case when tr_effdate <= :_month4 THEN tr_mtl_std  END tr_mtl_std_4
                        , case when tr_effdate <= :_month3 THEN tr_mtl_std  END tr_mtl_std_3
                    from tr_hist 
                    where tr_domain = 'EYE'
                    and tr_effdate <= :_month4_
                    and tr_loc != 'LVFG'
                ) c ON c.tr_effdate = tr.tr_effdate
                    and c.tr_part = tr.tr_part
                

				where pt_domain = 'EYE'
                and pt_part = 'ASY-03182-100'
                group by pt_part 
			) a
            group by pt_part
			WITH (nolock)    
		";

        $month4 = "2021-11-30";
        $month3 = "2020-12-31";
        $month2 = "2022-01-31";
        $month1 = "2022-02-28";

        $query = $this->db->prepare($mainQry);
		$query->bindParam(":month1", $month1, PDO::PARAM_STR);
		$query->bindParam(":month2", $month2, PDO::PARAM_STR);
		$query->bindParam(":month3", $month3, PDO::PARAM_STR);
		$query->bindParam(":month3_", $month3, PDO::PARAM_STR);
		$query->bindParam(":month4", $month4, PDO::PARAM_STR);
		$query->bindParam(":month4_", $month4, PDO::PARAM_STR);
		$query->bindParam(":month4__", $month4, PDO::PARAM_STR);
		$query->bindParam(":_month4_", $month4, PDO::PARAM_STR);

		$query->bindParam(":_month4", $month4, PDO::PARAM_STR);
		$query->bindParam(":_month3", $month3, PDO::PARAM_STR);

		$query->bindParam(":month1_0", $month1, PDO::PARAM_STR);
		$query->bindParam(":month2_0", $month2, PDO::PARAM_STR);
		$query->bindParam(":month3_0", $month3, PDO::PARAM_STR);
		$query->bindParam(":month4_0", $month4, PDO::PARAM_STR);

        $query->execute();
        return  $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function test_(){
        $month4 = "2021-11-30";
		$month3 = "2021-12-31";
		$month2 = "2022-01-31";
		$month1 = "2022-02-28";

		// $results = json_decode(file_get_contents("/var/www/html/server/Api/ItemUsage/item.json"), true);
		// return array(
		// 	"results" => $results,
		// 	"resultsq" => [],
		// 	"lastUpdate" => "2022-03-01 1:00pm"
		// );

		$qry = "
            select pt_part
            , in_avg_iss
            , pt_abc
            , sct_cst_tot 
            , CAST((case when inv_avg = 0 THEN 1000.0 when inv_avg > 0 THEN ((in_avg_iss_value/inv_avg)*(12/3)) END) AS DECIMAL(16,1)) m_12
            , CAST((case when inv_avg = 0 THEN 1000.0  when inv_avg > 0 THEN ((usage_3_months/inv_avg)*(12/3)) END) AS DECIMAL(16,1)) m_12_testing				
            , m_12_test
            , cp_cust
            , pt_status
            , pt_sfty_stk
            , pt_price
            , pt_part_type
            , onHandQty
            , onHandQty*sct_cst_tot oh_value
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
            , gl_ext_amount_4
            , gl_ext_amount_3
            , gl_ext_amount_2
            , gl_ext_amount_1
            , inv_avg
            , usage_3_months
            , usage_3_qty
            , pt_iss_pol
            , pt_buyer
            , pt_pm_code
            , pt_um
        from(
            select a.pt_part
                , in_avg_iss
                , in_avg_iss*sct_cst_tot in_avg_iss_value
                , IFNULL(tr.tr_qty_chg,0)+IFNULL(tr1.tr_qty_chg,0)+IFNULL(tr2.tr_qty_chg,0)+IFNULL(tr3.tr_qty_chg,0) avg_3_months
                , pt_abc
                , cp_cust
                , pt_status
                , pt_sfty_stk
                , pt_price
                , pt_part_type
                , sct_cst_tot
                , (CAST(((((in_avg_iss/pt_avg_int)*365)*sct_cst_tot)) AS DECIMAL(16,1)))  m_12
                , (in_avg_iss*sct_cst_tot) m_12_test
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

                , IFNULL(tr.tr_qty_chg,0) gl_ext_amount_4
                , IFNULL(tr1.tr_qty_chg,0) gl_ext_amount_3
                , IFNULL(tr2.tr_qty_chg,0) gl_ext_amount_2 
                , IFNULL(tr3.tr_qty_chg,0) gl_ext_amount_1

                , IFNULL(ABS(use1.usage_3_months),0) usage_3_months

                , (IFNULL(tr.tr_qty_chg,0)+IFNULL(tr1.tr_qty_chg,0)+IFNULL(tr2.tr_qty_chg,0)+IFNULL(tr3.tr_qty_chg,0)) / 4 inv_avg
                , ABS(usage_3_qty) usage_3_qty
            from pt_mstr a

            left join (
                select pt_part, sum(tr_mtl_std*tr_qty_chg) tr_qty_chg
                from(
                    select  pt_part, max(c.tr_mtl_std) tr_mtl_std, max(tr_qty_chg) tr_qty_chg
                    from pt_mstr a

                    left join (
                        select a.tr_part
                            , max(tr_effdate) tr_effdate
                            , sum(case when tr_status != '' THEN case when a.tr_loc = 'INTGRTD' THEN a.tr_qty_chg ELSE a.tr_qty_loc END END) tr_qty_chg
                        from tr_hist a 
                        where a.tr_effdate <= :month4
                            and tr_domain = 'EYE'
                            and tr_loc != 'LVFG'
                        group by a.tr_part
                    ) tr ON tr.tr_part = a.pt_part 

                    LEFT join (
                        select tr_effdate
                            , tr_part
                            , tr_mtl_std
                        from tr_hist 
                        where tr_effdate <= :month4_ 
                        and tr_domain = 'EYE'
                        and tr_loc != 'LVFG'
                    ) c ON c.tr_effdate = tr.tr_effdate
                        and c.tr_part = tr.tr_part
                    
                    where pt_domain = 'EYE'
                    
                    group by pt_part 
                ) a
                group by pt_part
            ) tr ON tr.pt_part = a.pt_part 
            
            left join (
                select  a.tr_part
                , sum(a.tr_qty_chg*tr_mtl_std) usage_3_months
                , sum(a.tr_qty_chg) usage_3_qty

                from tr_hist a 
                LEFT JOIN ( 
                    select sct_part 
                        , max(sct_cst_tot) sct_cst_tot 
                    from sct_det 
                    WHERE sct_sim = 'Standard' 
                        and sct_site = 'EYE01'
                        and sct_domain = 'EYE'  
                        and sct_site  = 'EYE01'
                    group by sct_part 
                ) d ON d.sct_part = a.tr_part

                where  tr_domain = 'EYE'
                    and a.tr_type IN ('ISS-SO', 'ISS-WO', 'ISS-UNP') 
                    AND a.tr_effdate between :beginningMonth AND :endingMonth
                group by a.tr_part
            ) use1 ON use1.tr_part = a.pt_part 

            left join (
                select in_part, 
                    in_avg_iss
                from in_mstr 
                where in_domain = 'EYE' 
                and in_site = 'EYE01'
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
        WITH (nolock)
		";
		$query = $this->db->prepare($qry);
		$query->bindParam(":month1", $month1, PDO::PARAM_STR);
		$query->bindParam(":month1_", $month1, PDO::PARAM_STR);
		$query->bindParam(":month2", $month2, PDO::PARAM_STR);
		$query->bindParam(":month2_", $month2, PDO::PARAM_STR);
		$query->bindParam(":month3", $month3, PDO::PARAM_STR);
		$query->bindParam(":month3_", $month3, PDO::PARAM_STR);
		$query->bindParam(":month4", $month4, PDO::PARAM_STR);
		$query->bindParam(":month4_", $month4, PDO::PARAM_STR);
		$query->bindParam(":beginningMonth", $month4, PDO::PARAM_STR);
		$query->bindParam(":endingMonth", $month1, PDO::PARAM_STR);
		$query->execute();
		return  $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function onTimeDelivery($dateFrom = '2021-01-01', $dateTo = '2021-12-31')
    {
        $mainQry = "
        select a.sod_nbr, a.sod_line, abs_ship_qty, sod_qty_ord, sod_qty_ship, 
        case when sod_qty_ord - abs_ship_qty > 0 and sod_qty_ord > 0 THEN 1 ELSE 0 END shipped_partially , 
        case when sod_qty_ord = sod_qty_ship and sod_qty_ord > 0 THEN 1 ELSE 0 END shipped_complete , 
        case when  sod_qty_ord - sod_qty_ship = 0 AND abs_ship_qty = sod_qty_ship AND a.sod_due_date = '" . $this->nowDate . "' AND g.abs_shp_date <= '" . $this->nowDate . "'  THEN 1 ELSE 0 END  shipped_complete_on_time , 
        abs_shp_date,
        sod_due_date,
        sod_list_pr, 
        sod_list_pr*g.abs_ship_qty ext
        from sod_det a 
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
        
        where a.sod_due_date = curDate()
        and a.sod_domain = 'EYE'
        order by sod_list_pr*g.abs_ship_qty DESC
			";

        $query = $this->db->prepare($mainQry);

        $query->execute();
        return  $query->fetchAll(PDO::FETCH_ASSOC);
    }


    public function run()
    {

        return $this->onTimeDelivery();
    }
}


use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
use EyefiDb\Databases\DatabaseQad as DatabaseQad;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();

$data = new unfinishedForkliftInspections($db, $dbQad);
$r = $data->run();

echo $db_connect_qad->jsonToTable($r);
